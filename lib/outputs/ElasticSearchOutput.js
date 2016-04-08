var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    _ = require('underscore')

/**
 * Outputs events to ElasticSearch vi REST
 * TODO: index prefix or full name
 * TODO: document id - es will make one by default
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

    self.queueOptions = {
        batchSize: useOptions.batchSize || 100,
        timeout: useOptions.batchTimeout || 1000
    }

    self.stats = {
        requests: 0,
        pendingRequests: 0
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

    logger.debug(self.name, 'starting up')

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
            day = timestamp.getDate()

        dateString += '.' + ((String(month).length == 1) ? '0' + month : month)
        dateString += '.' + ((String(day).length == 1) ? '0' + day : day)

        write += JSON.stringify({ "index": { "_index": self.indexPrefix + '-' + dateString, "_type": type } }) + '\n'
        write += JSON.stringify(event.data) + '\n'
    }

    if (write === '') {
        // Don't bother sending emtpy requests
        return
    }

    function handleResponse (response) {
        self.stats.pendingRequests--

        if (response.statusCode === 200) {
            response.on('data', function (data) {
                //console.log(data.toString())
            })

            //TODO: need to check response body for success, probably need to id the documents before hand
            self.emit('complete', queue.items)

            return
        }

        response.on('data', function (data) {
            self.logger.error(self.name, 'Failed to write events', response.statusCode, data.toString())
            self.logger.error(self.name, write)
            self.emit('failed', queue.items)
        })
    }

    var request = self.driver.request(self.httpOptions, handleResponse)

    request.on('error', function (error) {
        self.stats.pendingRequests--
        self.emit('failed', queue.items)
        self.logger.error(self.name, 'Error during request', error.stack)
    })

    self.stats.pendingRequests++
    self.stats.requests++
    request.write(write)
    request.end()
}

