var util = require('util')
  , EventEmitter = require('events').EventEmitter
  , RELPLib = require('relp-lib')
  , codecs = require('../codecs')

/**
 * Turns data received from stdin into events
 * //TODO: doc codecs
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
    RELP.super_.call(this)

    var self = this
      , streamStash = options.streamStash

    self.name = options.name || 'RELP'

    self.state = 0
    self.codec = options.codec || new codecs.RELPSyslog()
    self.EventContainer = options.EventContainer
    self.fields = options.fields || {}
    self.logger = options.logger

    self.server = new RELPLib.Server({
        host: options.host
      , port: options.port
      , logger: logger
    })

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

    self.logger.info(self.name, message.body)

    var eventData = util._extend(self.fields, {
            source: self.name
          , timestamp: new Date()
          , message: message.body
        })
      , event = new self.EventContainer(eventData)

    //Let RELP know we finished processing the message
    event.on('complete', function () {
        logger.debug(self.name, 'Acking event', event.eventId)
        self.server.ack(message)
    })

    if (self.codec) {
        self.codec.decode(event, function () {
            self.emit('event', event)
        })
    } else {
        self.emit('event', event)
    }
}