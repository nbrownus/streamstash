var util = require('util'),
    uuidv4 = require('uuid/v4'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    _ = require('underscore')

/**
 * Outputs events to Splunk via REST
 * TODO: index prefix or full name
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} options.hostname The Splunk host to send requests to
 * @param {String} options.path The path to the collector endpoint (default = '/services/collector')
 * @param {Boolean} [options.tls=true] Whether or not to use TLS (true or false, default=true)
 * @param {String} [options.auth] A basic auth header to use in the http request, format: `username:password`
 * @param {String} [options.HECUsername] Splunk HTTP Event Collector username
 * @param {String} [options.HECToken] Splunk HTTP Event Collector auth token
 * @param {String} [options.GUID] GUID channel identifier, required for HEC raw submission
 * @param {String} [options.indexPrefix='logstash'] The Splunk index prefix to use
 * @param {object} [options.agent] An http or https agent, useful for providing your own CA, among other things
 * @param {Number} [options.batchSize=100] The ideal size for each batch insertion request
 * @param {Number} [options.batchTimeout=1000] The time to wait for a batch to reach `options.batchSize`. If the batch size
 *      isn't met within this time the insertion request is sent with whatever is in the current batch
 * @param {Number} [options.port=8088] The port on the host to send requests to
 * @param {String} [options.typeField=] The top level field in the event#data object to use for the type value
 * @param {String} [options.defaultType='unknown'] The default type value if typeField is undefined
 * @param {Object} [options.headers] Headers to use when sending http(s) requests to elasticsearch
 * @param {Function} [options.preRequest] A function that will be called before sending the bulk request
 * @param {String} [options.timestampField='timestamp'] The top level field in the event#data object to use for the timestamp value
 * @param {String} [options.idField=undefined] The top level field in the event#data object to use for the id value
 * @param {String} [options.name='Splunk'] A name to use for logging, must be unique to other output plugins
 *
 * @constructor
 */
let SplunkOutput = function (options) {
    SplunkOutput.super_.call(this)

    let self = this,
        useOptions = options || {}

    if (!useOptions.streamStash) {
        throw new Error('The streamstash object was not provided to the constructor')
    }

    if (!useOptions.hostname) {
        throw new Error('No hostname was provided')
    }

    self.name = useOptions.name || 'Splunk'
    self.indexPrefix = useOptions.indexPrefix || 'logstash'

    let streamStash = useOptions.streamStash

    if (useOptions.tls) {
        self.agent = useOptions.agent || new https.Agent({ maxSockets: 1000, rejectUnauthorized: true })
        self.driver = https
    } else {
        self.agent = useOptions.agent || new http.Agent({ maxSockets: 1000 })
        self.driver = http
    }

    self.httpOptions = {
        hostname: useOptions.hostname,
        port: useOptions.port || 8088,
        path: useOptions.path || '/services/collector',
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
    if (useOptions.HECUsername && useOptions.HECToken) {
        self.httpOptions.headers['Authorization'] = useOptions.HECUsername + " " + useOptions.HECToken
    }
    // If using the raw path, a GUID channel ID is required.
    if (useOptions.path == '/services/collector/raw') {
        if (useOptions.GUID) {
            self.guid = useOptions.GUID
        } else {
            // If a static GUID is not provided, then generate one.
            self.guid = uuidv4();
        }
        self.httpOptions.headers['X-Splunk-Request-Channel'] = self.guid
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
    self.idField = useOptions.idField

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

SplunkOutput.NAME = "Splunk"
SplunkOutput.DESCRIPTION = "Outputs events to Splunk via REST"

util.inherits(SplunkOutput, EventEmitter)
module.exports = SplunkOutput

/**
 * Prepares and queues an event to send to Splunk
 *
 * @param {EventContainer} eventContainer The event emitted from Streamstash
 *
 * @private
 */
SplunkOutput.prototype._handleOutput = function (eventContainer) {
    if (this.state !== 1) {
        return
    }

    let self = this

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
 * Attempts to put data into Splunk
 * Will only perform the request if the queue has hit the configured batchSize limit or if the action was forced due to
 * batchTimeout firing
 *
 * @param {Boolean} [forced] Whether or not the action is being forced due to batchTimeout firing
 *
 * @private
 */
SplunkOutput.prototype._performPost = function (forced) {
    let self = this

    if (self.queue.items.length < self.queueOptions.batchSize && !forced) {
        return
    }

    //Copy the queue into here and allow a new queue to fill up
    //TODO: Clean this queueing up!
    let queue = self.queue

    self.queue = {
        items: [],
        write: [],
        timer: null
    }

    clearTimeout(queue.timer)

    let write = ''

    for (let eventId in queue.items) {
        //TODO: if event.data[self.timestampField] does not exist we should log a warning
        let event = queue.items[eventId],
            type = event.data[self.typeField] || self.defaultType,
            timestamp = event.data[self.timestampField] || event.data['@timestamp'] || new Date(),
            epoch = timestamp.getTime()/1000
        //Remove Elasticsearch fields
        delete event.data['@timestamp']
        delete event.data['_type']
        let useData = util._extend({}, event.data)

        write += '{'
        write += '\"sourcetype\":' + JSON.stringify(type)
        write += ',\"time\":' + JSON.stringify(epoch)
        write += ',\"event\":' + JSON.stringify(useData)
        write += '}\n'
    }

    if (write === '') {
        // Don't bother sending emtpy requests
        return
    }

    function handleResponse (response) {
        self.stats.pendingRequests--

        if (response.statusCode === 200) {
            let allData = ''
            response.on('data', function (data) {
                allData += String(data)
            })

            response.on('end', function () {
                self._finishRequest(allData, queue)
            })

            return
        }

        response.on('data', function (data) {
            self.logger.error(self.name, 'Failed to write events', { status_code: response.statusCode, splunk_response: data.toString(), request_body: write })
            self.emit('failed', queue.items)
        })
    }

    let request = self.driver.request(self.preRequest(self.httpOptions, write), handleResponse)

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
 * Deal with the bulk response
 *
 * @param {String} data The response string
 * @param {Object} queue The queue object for this request
 *
 * @private
 */
SplunkOutput.prototype._finishRequest = function (data, queue) {
    let self = this

    // Shortcut to avoid json decoding the whole return blob. if there is no `"errors":true` then all was good
    if (data.indexOf('errors":t') === -1) {
        self.emit('complete', queue.items)
        return
    }

    let failed = []

    try {
        let res = JSON.parse(data),
            badIds = {}

        res.items.forEach(function (SplunkEvent) {
            // If the http response code is 300 or above then consider it a failure
            if (SplunkEvent['index']['status'] > 299) {
                badIds[SplunkEvent['index']['_id']] = SplunkEvent['index']['error']
            }
        })

        for (let i = queue.items.length - 1; i >= 0; i--) {
            if (badIds.hasOwnProperty(queue.items[i].eventId) === true) {
                self.logger.error(
                    self.name,
                    'Event ' + queue.items[i].eventId + ' could not be sent to Splunk',
                    {
                        splunk_error: JSON.stringify(badIds[queue.items[i].eventId]),
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
        self.logger.error(self.name, 'Error consuming Splunk response', { error: error.stack, splunk_response: data })
        // We aren't sure where we failed so every event fails
        if (queue.items.length > 0) {
            self.emit('failed', queue.items)
        }

        if (failed.length > 0) {
            self.emit('failed', failed)
        }
    }
}
