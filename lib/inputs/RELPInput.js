var util = require('util'),
    BaseInput = require('./BaseInput'),
    RELPLib = require('relp'),
    codecs = require('../codecs')

/**
 * Turns data received from a RELP client into events
 *
 * @param {Object} options.host The host to listen on
 * @param {Object} options.port The port to listen on
 * @param {net.Server} [options.server] A custom server instance, mainly for tls
 * @param {String} [options.connectionEvent='connection'] Change the event name for new connections.
 *      This is especially useful for TLS support since a TLS server emits 'secureConnection` events when
 *      a socket is ready
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
        proxyProtocol: options.proxyProtocol,
        connectionEvent: options.connectionEvent,
        server: options.server,
        logger: logger
    })

    //TODO: if a socket dies try to stop outputs, only if it is still processing in filters
    self.server.pause()

    logger.debug(self.name, 'starting up')

    self.streamStash.on('start', function () {
        self.state = 1
        self.server.resume()
        self.emit('started')
    })

    self.streamStash.on('stopInput', function () {
        self.state = 0
        self.server.pause()
        self.emit('stoppedInput')
    })

    self.streamStash.once('stop', function () {
        //TODO: shutdown
        self.emit('stopped')
    })

    self.server.on('message', function (message) {
        self._handleInput(message)
    })

    setInterval(
        function () {
            self.streamStash.telemetry.gauge(self.name + '.connections', Object.keys(self.server.sockets).length)
        },
        5000
    )
}

RELPInput.NAME = "RELP"
RELPInput.DESCRIPTION = "Turns data received from a RELP client into events"

util.inherits(RELPInput, BaseInput)
module.exports = RELPInput

RELPInput.prototype._handleInput = function (message) {
    var self = this

    this._emitEvent(message.body, function (event) {
        event.data.remoteAddress = message.remoteAddress
        event.data.proxyDetails = message.proxyDetails

        event.on('complete', function () {
            logger.debug(self.name, 'Acking event', event.eventId)

            if (event.state === EventContainer.STATE.FAILED) {
                self.server.nack(message)
            } else {
                self.server.ack(message)
            }
        })

        self.emit('event', event)
    })
}
