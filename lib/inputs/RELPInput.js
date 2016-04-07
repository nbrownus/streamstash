var util = require('util'),
    BaseInput = require('./BaseInput'),
    RELPLib = require('relp'),
    parsers = require('../parsers'),
    EventContainer = require('../EventContainer')

/**
 * Turns data received from a RELP client into events
 *
 * @param {Object} options.host The host to listen on
 * @param {Object} options.port The port to listen on
 * @param {Boolean} [options.proxyProtocol=false] True enables proxy protocol
 * @param {net.Server} [options.server] A custom server instance, mainly for tls
 * @param {String} [options.connectionEvent='connection'] Change the event name for new connections.
 *      This is especially useful for TLS support since a TLS server emits 'secureConnection` events when
 *      a socket is ready
 *
 * @extends BaseInput
 * @constructor
 */
var RELPInput = function (options) {
    var useOptions = options || {}

    useOptions.parser = options.parser || parsers.relpSyslogParser
    useOptions.name = options.name || RELPInput.NAME

    RELPInput.super_.call(this, useOptions)

    var self = this

    self.server = new RELPLib.Server({
        host: useOptions.host,
        port: useOptions.port,
        proxyProtocol: useOptions.proxyProtocol,
        connectionEvent: useOptions.connectionEvent,
        server: useOptions.server,
        logger: self.logger
    })

    //TODO: if a socket dies try to stop outputs, only if it is still processing in filters
    self.server.pause()

    self.logger.debug(self.name, 'starting up')

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
            self.streamStash.telemetry.gauge('inputs.' + self.name + '.connections', Object.keys(self.server.sockets).length)
        },
        5000
    )
}

RELPInput.NAME = 'RELP'
RELPInput.DESCRIPTION = 'Turns data received from a RELP client into events'

util.inherits(RELPInput, BaseInput)
module.exports = RELPInput

RELPInput.prototype._handleInput = function (message) {
    var self = this

    this._emitEvent(message.body, function (event) {
        if (message.hasOwnProperty('proxyDetails')) {
            event.data.event_source['proxy_client_ip'] = message.proxyDetails.clientIp
            event.data.event_source['proxy_client_port'] = message.proxyDetails.clientPort
            event.data.event_source['proxy_ip'] = message.proxyDetails.proxyIp
            event.data.event_source['proxy_port'] = message.proxyDetails.proxyPort
        } else {
            event.data.event_source['remote_address'] = message.remoteAddress
        }

        event.on('complete', function () {
            self.logger.debug(self.name, 'Acking event', event.eventId)

            if (event.state === EventContainer.STATE.FAILED) {
                self.server.nack(message)
            } else {
                self.server.ack(message)
            }
        })

        self.emit('event', event)
    })
}
