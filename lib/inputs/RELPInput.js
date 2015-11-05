var util = require('util'),
    BaseInput = require('./BaseInput'),
    RELPLib = require('relp'),
    codecs = require('../codecs')

/**
 * Turns data received from a RELP client into events
 *
 * @param {Object} options.host The host to listen on
 * @param {Object} options.port The port to listen on
 *
 * @extends BaseInput
 * @constructor
 */
var RELPInput = function (options) {
    //TODO: host and port are not enough config options in the long run for servers
    RELPInput.super_.call(this, options)

    var self = this

    self.name = options.name || 'RELP'

    self.codec = options.hasOwnProperty('codec') ? options.codec : new codecs.RELPSyslog()

    self.server = new RELPLib.Server({
        host: options.host,
        port: options.port,
        logger: logger
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

RELPInput.NAME = "RELP"
RELPInput.DESCRIPTION = "Turns data received from a RELP client into events"

util.inherits(RELPInput, BaseInput)
module.exports = RELPInput

RELPInput.prototype._handleInput = function (message) {
    this._emitEvent(message.body)

    //Let the client know we finished processing the message, don't want to see it again
    //event.on('complete', function () {
    //    logger.debug(self.name, 'Acking event', event.eventId)
    //})

    //TODO: Currently immediately acking messages to increase the number of messages we can handle/s
    //RELP windows over 128 tease out some weird bug so we do this.
    self.server.ack(message)
}
