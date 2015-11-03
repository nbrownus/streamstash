var util = require('util')
  , EventEmitter = require('events').EventEmitter
  , RELPLib = require('relp')
  , codecs = require('../codecs')
  , _ = require('underscore')

/**
 * Turns data received from a RELP client into events
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Function} options.EventContainer The event container constructor to use
 * @param {Object} options.logger A logger to use for logging
 * @param {String} [options.name='RELP'] A name to use for the `source` value as well as in logging. Must be unique
 *      to other input plugins
 * @param {Object} options.host The host to listen on
 * @param {Object} options.port = The port to listen on
 * @param {Object} [options.fields] Extra fields to add on each event
 *
 * @constructor
 */
var RELP = function (options) {
    //TODO: host and port are not enough config options in the long run for servers
    RELP.super_.call(this)

    var self = this
      , streamStash = options.streamStash

    self.name = options.name || 'RELP'

    self.state = 0

    self.codec = options.hasOwnProperty('codec') ? options.codec : new codecs.RELPSyslog()
    self.EventContainer = options.EventContainer
    self.fields = options.fields || {}
    self.logger = options.logger

    self.server = new RELPLib.Server({
        host: options.host
      , port: options.port
      , logger: logger
    })

    //TODO: if a socket dies try to stop outputs, only if it is still processing in filters
    self.server.pause()

    logger.debug(self.name, 'starting up')

    streamStash.once('start', function () {
        self.state = 1
        self.server.resume()
        self.emit('started')
    })

    streamStash.once('stopInput', function () {
        self.state = 0
        self.server.pause()
        self.emit('stoppedInput')
    })

    streamStash.once('stop', function () {
        //TODO: shutdown
        self.emit('stopped')
    })

    self.server.on('message', function (message) {
        self._handleInput(message)
    })
}

util.inherits(RELP, EventEmitter)
module.exports = RELP

RELP.prototype._handleInput = function (message) {
    var self = this

    if (self.state === 0) {
        return
    }

    var eventData = _.extend({}, self.fields, { source: self.name, timestamp: new Date(), message: message.body })
      , event = new self.EventContainer(eventData)

    //Let the client know we finished processing the message, don't want to see it again
    //event.on('complete', function () {
    //    logger.debug(self.name, 'Acking event', event.eventId)
    //})

    //TODO: not sold on this codec thing
    if (self.codec) {
        self.codec.decode(event, function () {
            self.emit('event', event)
        })
    } else {
        self.emit('event', event)
    }

    //Currently immediately acking messages to increase the number of messages we can handle/s
    //RELP windows over 128 tease out some weird bug so we do this.
    self.server.ack(message)
}
