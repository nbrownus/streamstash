var util = require('util')
  , EventEmitter = require('events').EventEmitter
  , http = require('http')
  , _ = require('underscore')

//TODO: _extend is leaking into first arg, duh. Use underscore

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
 * TODO: support batch shit
 * TODO: jsonpath for type/index/document id?
 * TODO: template support in es?
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} options.hostname The elastic search host to send requests to
 * @param {Number} [options.port=9200] The port on the host to send requests to
 * @param {String} [options.typeField=] The top level field in the event#data object to use for the type value
 * @param {String} [options.defaultType='unknown'] The default type value if typeField is undefined
 * @param {String} [options.name='ElasticSearch'] A name to use for logging, must be unique to other output plugins
 * @param {Object} [options.rename] A map of top level data fields to rename
 * @param {Object} [options.fields] Extra fields to add on each event
 *
 * @constructor
 */
var ElasticSearch = function (options) {
    ElasticSearch.super_.call(this)

    var self = this
      , streamStash = options.streamStash

    self.name = options.name || 'ElasticSearch'

    self.httpOptions = {
        hostname: options.hostname
      , port: options.port || 9200
    }

    self.logger = options.logger
    self.typeField = options.typeField
    self.defaultType = options.defaultType || 'unknown'
    self.addFields = options.fields || {}
    self.renameFields = options.rename || {}

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

util.inherits(ElasticSearch, EventEmitter)
module.exports = ElasticSearch

ElasticSearch.prototype._handleOutput = function (eventContainer) {
    var self = this
      , write

    if (self.state !== 1) {
        return
    }

    function handleResponse (response) {
        if (response.statusCode === 201) {
            return self.emit('complete', eventContainer)
        }

        //TODO: retry failures
        response.on('data', function (data) {
            self.logger.error(self.name, 'Failed to write event', data.toString(), util.inspect(write, 0, 5))
        })
    }

    var type = eventContainer.data[self.typeField] || self.defaultType
      , timestamp = eventContainer.data.timestamp
      , dateString = timestamp.getFullYear()
      , month = timestamp.getMonth() + 1
      , day = timestamp.getDate()

    dateString += '.' + ((String(month).length == 1) ? '0' + month : month)
    dateString += '.' + ((String(day).length == 1) ? '0' + day : day)

    var options = {
        hostname: self.httpOptions.hostname
      , port: self.httpOptions.port
      , path: '/logstash-' + dateString + '/' + type
      , method: 'POST'
    }

    var request = http.request(options, handleResponse)

    write = _.extend({}, self.addFields, eventContainer.data)
    for (var oldName in this.renameFields) {
        if (write.hasOwnProperty(oldName) === true) {
            if (this.renameFields[oldName] !== void 0) {
                write[this.renameFields[oldName]] = write[oldName]
            }

            delete write[oldName]
        }
    }

    request.write(JSON.stringify(write))
    request.end()
}
