var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    _ = require('underscore')

/**
 * Configuration options:
 *   Have event container hold special data for each output plugin, by name, for dynamic configuration?
 */

/**
 * Outputs events to ElasticSearch vi REST
 * TODO: index - the index to write to logstash-%{+YYYY.MM.dd}
 * TODO: document id - es will make one by default
 * TODO: type - The type, this is special and should be different for different data objects
 * TODO: replication
 * TODO: HTTP stuff: user, password, ssl
 * TODO: jsonpath for type/index/document id?
 * TODO: template support in es?
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} options.hostname The elastic search host to send requests to
 * @param {Boolean} [options.tls=false] Whether or not to use tls (true for https, false for http)
 * @param {String} [options.auth] A basic auth header to use in the http request, format: `username:password`
 * @param {object} [options.agent] An http or https agent, useful for providing your own CA, among other things
 * @param {Number} [options.batchSize=100] The ideal size for each batch insertion request
 * @param {Number} [options.batchTimeout=1000] The time to wait for a batch to reach `options.batchSize`. If the batch size
 *      isn't met within this time the insertion request is sent with whatever is in the current batch
 * @param {Number} [options.port=9200] The port on the host to send requests to
 * @param {String} [options.typeField=] The top level field in the event#data object to use for the type value
 * @param {String} [options.defaultType='unknown'] The default type value if typeField is undefined
 * @param {String} [options.name='ElasticSearch'] A name to use for logging, must be unique to other output plugins
 * @param {Object} [options.rename] A map of top level data fields to rename
 * @param {Object} [options.fields] Extra fields to add on each event
 *
 * @constructor
 */
var ElasticSearchOutput = function (options) {
    ElasticSearch.super_.call(this)

    var self = this,
        useOptions = options || {}

    if (!useOptions.streamStash) {
        throw new Error('The streamstash object was not provided to the constructor')
    }

    if (!useOptions.hostname) {
        throw new Error('No hostname was provided')
    }

    self.name = useOptions.name || 'ElasticSearch'

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
        batchSize: useOptions.batchSize || 100
      , timeout: useOptions.batchTimeout || 1000
    }

    self.logger = useOptions.logger
    self.typeField = useOptions.typeField
    self.defaultType = useOptions.defaultType || 'unknown'
    self.addFields = useOptions.fields || {}
    self.renameFields = useOptions.rename || {}
    self.queue = {
        items: []
      , write: []
      , count: 0
      , timer: null
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
      , write = _.extend({}, self.addFields, eventContainer.data)
      , type = eventContainer.data[self.typeField] || self.defaultType
      , timestamp = eventContainer.data.timestamp
      , dateString = timestamp.getFullYear()
      , month = timestamp.getMonth() + 1
      , day = timestamp.getDate()

    dateString += '.' + ((String(month).length == 1) ? '0' + month : month)
    dateString += '.' + ((String(day).length == 1) ? '0' + day : day)

    for (var oldName in this.renameFields) {
        if (write.hasOwnProperty(oldName) === true) {
            if (this.renameFields[oldName] !== void 0) {
                write[this.renameFields[oldName]] = write[oldName]
            }

            delete write[oldName]
        }
    }

    this.queue.items.push(eventContainer)
    this.queue.write.push(JSON.stringify({ "index" : { "_index" : 'logstash-' + dateString, "_type" : type }}))
    this.queue.write.push(JSON.stringify(write))

    if (!self.queue.timer) {
        self.queue.timer = setTimeout(function () { self._performPost(true) }, self.queueOptions.timeout)
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
        items: []
      , write: []
      , timer: null
    }

    clearTimeout(queue.timer)

    var write = queue.write.join('\n') + '\n'

    function handleResponse (response) {
        if (response.statusCode === 200) {
            response.on('data', function (data) {
                //console.log(data.toString())
            })

            //TODO: need to check response body for success, probably need to id the documents before hand
            self.emit('complete', queue.items)

            return
        }

        //TODO: retry failures
        response.on('data', function (data) {
            self.logger.error(self.name, 'Failed to write events', response.statusCode, data.toString())
            self.logger.error(self.name, write)
            self.emit('complete', queue.items)
        })
    }

    var request = self.driver.request(self.httpOptions, handleResponse)

    request.on('error', function (error) {
        self.logger.error(self.name, 'Error during request', error.stack)
    })

    request.write(write)
    request.end()
}

