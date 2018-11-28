var util = require('util'),
    BaseInput = require('./BaseInput'),
    readline = require('readline'),
    ProxyProtocolHandler = require('./ProxyProtocol')

/**
 * Turns data received from a socket server into events
 * You must call `listen` after adding this input
 *
 * @param {String} options.name
 * @param {Object} options.server A server object or anything that emits a readable stream
 * @param {Boolean} [options.proxyProtocol=false] True enables proxy protocol
 * @param {string} [options.connectionEvent='connection'] The connection event to listen on for new sockets
 *
 * @extends BaseInput
 * @constructor
 */
var SocketInput = function (options) {
    SocketInput.super_.call(this, options)

    var self = this

    self.name = options.name || SocketInput.NAME
    self.server = options.server
    self.connectionEvent = options.connectionEvent || 'connection'

    self.sockets = {}
    self._id = 0

    self.logger.debug(self.name, 'starting up')

    self._wireServer()

    if (options.proxyProtocol) {
        ProxyProtocolHandler(self.server)
    }

    self.streamStash.on('start', function () {
        self.state = 1
        for (var socketId in self.sockets) {
            self.sockets[socketId].resume()
        }
        self.emit('started')
    })

    self.streamStash.on('stopInput', function () {
        self.state = 0

        for (var socketId in self.sockets) {
            self.sockets[socketId].pause()
        }

        self.emit('stoppedInput')
    })

    self.streamStash.on('stop', function () {
        self.emit('stopped')
    })
}

SocketInput.NAME = "SocketInput"
SocketInput.DESCRIPTION = "Handles objects that emit connection events the can consumed as readable streams"

util.inherits(SocketInput, BaseInput)
module.exports = SocketInput

SocketInput.prototype._wireSocket = function (socket) {
    //TODO: handle close, error events, etc
    var self = this

    socket._id = self._id++
    self.sockets[socket._id] = socket

    socket.on('error', function (error) {
        self.logger.error(self.name, 'Connection # ' + socket.socketId + ' (' + self.remoteAddress + ') had an error', { error: error.stack || error })
        socket.destroy()
    })

    socket.on('close', function () {
        delete self.sockets[socket._id]
    })

    socket._rl = readline.createInterface({ input: socket })

    socket._rl.on('line', function (line) {
        self._emitEvent(line)
    })
}

SocketInput.prototype._wireServer = function () {
    var self = this

    self.server.on('connection', function (socket) {
        if (self.state !== 1) {
            socket.pause()
        }
        self._wireSocket(socket)
    })
}
