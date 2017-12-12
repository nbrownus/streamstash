var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    _ = require('underscore')

/**
 * Outputs events to ElasticSearch vi REST
 * TODO: index prefix or full name
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} options.hostname The elastic search host to send requests to
 * @param {Boolean} [options.tls=false] Whether or not to use tls (true for https, false for http)
 * @param {String} [options.auth] A basic auth header to use in the http request, format: `username:password`
 * @param {String} [options.indexPrefix='logstash'] The elasticsearch index prefix to use
 * @param {object} [options.agent] An http or https agent, useful for providing your own CA, among other things
 * @param {Number} [options.batchSize=100] The ideal size for each batch insertion request
 * @param {Number} [options.batchTimeout=1000] The time to wait for a batch to reach `options.batchSize`. If the batch size
 *      isn't met within this time the insertion request is sent with whatever is in the current batch
 * @param {Number} [options.port=9200] The port on the host to send requests to
 * @param {String} [options.typeField=] The top level field in the event#data object to use for the type value
 * @param {String} [options.defaultType='unknown'] The default type value if typeField is undefined
 * @param {Object} [options.headers] Headers to use when sending http(s) requests to elasticsearch
 * @param {Function} [options.preRequest] A function that will be called before sending the bulk request
 * @param {String} [options.timestampField='timestamp'] The top level field in the event#data object to use for the timestamp value
 * @param {String} [options.name='ElasticSearch'] A name to use for logging, must be unique to other output plugins
 *
 * @constructor
 */
var ElasticSearchOutput = function (options) {
    ElasticSearchOutput.super_.call(this)

    var self = this,
        useOptions = options || {}

    if (!useOptions.streamStash) {
        throw new Error('The streamstash object was not provided to the constructor')
    }

    if (!useOptions.hostname) {
        throw new Error('No hostname was provided')
    }

    self.name = useOptions.name || 'ElasticSearch'
    self.indexPrefix = useOptions.indexPrefix || 'logstash'

    var streamStash = useOptions.streamStash

    if (useOptions.tls) {
        self.agent = useOptions.agent || new https.Agent({ maxSockets: 1000, rejectUnauthorized: true })
        self.driver = https
    } else {
        self.agent = useOptions.agent || new http.Agent({ maxSockets: 1000 })
        self.driver = http
    }

    self.httpOptions = {
        hostname: useOptions.hostname,
        port: useOptions.port || 9200,
        path: '/_bulk',
        method: 'POST',
        agent: self.agent
    }

    if (useOptions.auth) {
        self.httpOptions.auth = useOptions.auth
    }

    self.httpOptions.headers = {}
    if (useOptions.headers) {
        self.httpOptions.headers = useOptions.headers
    }

    self.httpOptions.headers['content-type'] = 'application/json'

    self.queueOptions = {
        batchSize: useOptions.batchSize || 100,
        timeout: useOptions.batchTimeout || 1000
    }

    self.stats = {
        requests: 0,
        pendingRequests: 0
    }

    self.preRequest = function (options) { return options }
    if (useOptions.preRequest) {
        self.preRequest = useOptions.preRequest
    }

    self.logger = useOptions.logger
    self.typeField = useOptions.typeField
    self.defaultType = useOptions.defaultType || 'unknown'
    self.timestampField = useOptions.timestampField || 'timestamp'

    self.queue = {
        items: [],
        timer: null
    }

    self.state = 0

    self.logger.debug(self.name, 'starting up')

    streamStash.once('start', function () {
        self.state = 1
        self.emit('started')
    })

    streamStash.once('stop', function () {
        self.state = 0

        //TODO: make sure agent has completed all requests

        self.emit('stopped')
    })

    streamStash.on('output', function (eventContainer) {
        self._handleOutput(eventContainer)
    })

    setInterval(
        function () {
            //TODO: add how long a request is taking
            streamStash.telemetry.gauge('outputs.' + self.name + '.total_requests', self.stats.requests)
            streamStash.telemetry.gauge('outputs.' + self.name + '.current_requests', self.stats.pendingRequests)
            streamStash.telemetry.gauge('outputs.' + self.name + '.current_batch_size', self.queue.items.length)
        },
        5000
    )
}

ElasticSearchOutput.NAME = "ElasticSearch"
ElasticSearchOutput.DESCRIPTION = "Outputs events to ElasticSearch vi REST"

util.inherits(ElasticSearchOutput, EventEmitter)
module.exports = ElasticSearchOutput

/**
 * Prepares and queues an event for insertion into Elasticsearch
 *
 * @param {EventContainer} eventContainer The event emitted from Streamstash
 *
 * @private
 */
ElasticSearchOutput.prototype._handleOutput = function (eventContainer) {
    if (this.state !== 1) {
        return
    }

    var self = this

    this.queue.items.push(eventContainer)

    if (!self.queue.timer) {
        self.queue.timer = setTimeout(
            function () {
                self._performPost(true)
            },
            self.queueOptions.timeout
        )
    }

    self._performPost()
}

/**
 * Attempts to put data into Elasticsearch
 * Will only perform the request if the queue has hit the configured batchSize limit or if the action was forced due to
 * batchTimeout firing
 *
 * @param {Boolean} [forced] Whether or not the action is being forced due to batchTimeout firing
 *
 * @private
 */
ElasticSearchOutput.prototype._performPost = function (forced) {
    var self = this

    if (self.queue.items.length < self.queueOptions.batchSize && !forced) {
        return
    }

    //Copy the queue into here and allow a new queue to fill up
    //TODO: Clean this queueing up!
    var queue = self.queue

    self.queue = {
        items: [],
        write: [],
        timer: null
    }

    clearTimeout(queue.timer)

    var write = ''

    for (var eventId in queue.items) {
        //TODO: if event.data[self.timestampField] does not exist we should log a warning

        var event = queue.items[eventId],
            type = event.data[self.typeField] || self.defaultType,
            timestamp = event.data[self.timestampField] || new Date(),
            dateString = timestamp.getFullYear(),
            month = timestamp.getMonth() + 1,
            day = timestamp.getDate(),
            useData = util._extend({}, event.data)

        dateString += '.' + ((String(month).length == 1) ? '0' + month : month)
        dateString += '.' + ((String(day).length == 1) ? '0' + day : day)

        write += JSON.stringify({ "index": { "_index": self.indexPrefix + '-' + dateString, "_type": type, '_id': event.eventId } }) + '\n'

        // Remove fields that elasticseach 2.0 cant have in the source
        //TODO: include these fields in the index line above?
        delete useData['_type']
        delete useData['_uid']
        delete useData['_id']
        delete useData['_type']
        delete useData['_source']
        delete useData['_all']
        delete useData['_parent']
        delete useData['_field_names']
        delete useData['_routing']
        delete useData['_index']
        delete useData['_size']
        delete useData['_timestamp']
        delete useData['_ttl']

        write += JSON.stringify(useData) + '\n'
    }

    if (write === '') {
        // Don't bother sending emtpy requests
        return
    }

    function handleResponse (response) {
        self.stats.pendingRequests--

        if (response.statusCode === 200) {
            var allData = ''
            response.on('data', function (data) {
                allData += String(data)
            })

            response.on('end', function () {
                self._finishRequest(allData, queue)
            })

            return
        }

        response.on('data', function (data) {
            self.logger.error(self.name, 'Failed to write events', { status_code: response.statusCode, elasticsearch_response: data.toString(), request_body: write })
            self.emit('failed', queue.items)
        })
    }

    var request = self.driver.request(self.preRequest(self.httpOptions, write), handleResponse)

    request.on('error', function (error) {
        self.stats.pendingRequests--
        self.emit('failed', queue.items)
        self.logger.error(self.name, 'Error during request', { error: error.stack })
    })

    self.stats.pendingRequests++
    self.stats.requests++
    request.write(write)
    request.end()
}

/**
 * Deals with consuming the es bulk index response
 *
 * @param {String} data The es response string
 * @param {Object} queue The queue object for this request
 *
 * @private
 */
ElasticSearchOutput.prototype._finishRequest = function (data, queue) {
    var self = this

    // Shortcut to avoid json decoding the whole return blob. if there is no `"errors":true` then all was good
    if (data.indexOf('errors":t') === -1) {
        self.emit('complete', queue.items)
        return
    }

    var failed = []

    try {
        var res = JSON.parse(data),
            badIds = {}

        res.items.forEach(function (esEvent) {
            // If the http response code is 300 or above then consider it a failure
            if (esEvent['index']['status'] > 299) {
                badIds[esEvent['index']['_id']] = esEvent['index']['error']
            }
        })

        for (var i = queue.items.length - 1; i >= 0; i--) {
            if (badIds.hasOwnProperty(queue.items[i].eventId) === true) {
                self.logger.error(
                    self.name,
                    'Event ' + queue.items[i].eventId + ' could not be inserted into elasticsearch',
                    {
                        elasticsearch_error: JSON.stringify(badIds[queue.items[i].eventId]),
                        event_data: JSON.stringify(queue.items[i].data)
                    }
                )
                failed.push(queue.items[i])
                queue.items.splice(i, 1)
            }
        }

        if (queue.items.length > 0) {
            self.emit('complete', queue.items)
        }

        if (failed.length > 0) {
            self.emit('failed', failed)
        }

    } catch (error) {
        self.logger.error(self.name, 'Error consuming elasticsearch response', { error: error.stack, elasticsearch_response: data })
        // We aren't sure where we failed so every event fails
        if (queue.items.length > 0) {
            self.emit('failed', queue.items)
        }

        if (failed.length > 0) {
            self.emit('failed', failed)
        }
    }
}
