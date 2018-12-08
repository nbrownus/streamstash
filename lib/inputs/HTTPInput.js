let util = require('util'),
    BaseInput = require('./BaseInput'),
    EventContainer = require('../EventContainer')

/**
 * Turns http requests into events
 * You must call `listen` after adding this input
 *
 * const http = require('http')
 * let s = http.createServer()
 * s.listen(9012)
 * addInputPlugin('http', { server: s })
 *
 * @param {String} options.name
 * @param {Object} options.server A server object or anything that emits a readable stream. You must call listen.
 *
 * @extends BaseInput
 * @constructor
 */
let HTTPInput = function (options) {
    HTTPInput.super_.call(this, options)

    let self = this

    self.name = options.name || HTTPInput.NAME
    self.server = options.server

    self.sockets = {}
    self._id = 0

    self.logger.debug(self.name, 'starting up')

    self._wireServer()

    self.streamStash.on('start', function () {
        self.state = 1
        for (let socketId in self.sockets) {
            self.sockets[socketId].resume()
        }

        self.emit('started')
    })

    self.streamStash.on('stopInput', function () {
        self.state = 0

        for (let socketId in self.sockets) {
            self.sockets[socketId].pause()
        }

        self.emit('stoppedInput')
    })

    self.streamStash.on('stop', function () {
        self.emit('stopped')
    })
}

HTTPInput.NAME = "HTTP"
HTTPInput.DESCRIPTION = "Listens to an http server and emits requests as events"

util.inherits(HTTPInput, BaseInput)
module.exports = HTTPInput

HTTPInput.prototype._wireSocket = function (socket) {
    let self = this

    socket._id = self._id++
    self.sockets[socket._id] = socket

    socket.on('error', function (error) {
        self.logger.error(self.name, 'Connection # ' + socket.socketId + ' (' + self.remoteAddress + ') had an error', { error: error.stack || error })
        socket.destroy()
    })

    socket.on('close', function () {
        delete self.sockets[socket._id]
    })
}

HTTPInput.prototype._wireServer = function () {
    let self = this

    self.server.on('connection', function (socket) {
        if (self.state !== 1) {
            socket.pause()
        }

        self._wireSocket(socket)
    })

    self.server.on('request', (req, res) => {
        let body = []

        req.on('end', () => {
            self._emitEvent(
                req.method + ' ' + req.url + ' HTTP/' + req.httpVersion,
                event => {
                    event.data.http_request = {
                        url: req.url,
                        headers: req.headers,
                        trailers: req.trailers,
                        body: Buffer.concat(body),
                        version: req.httpVersion,
                        remote: {
                            address: req.socket.remoteAddress,
                            family: req.socket.remoteFamily,
                            port: req.socket.remotePort,
                        }
                    }

                    event.on('complete', function () {
                        if (event.state === EventContainer.STATE.FAILED) {
                            self.logger.debug(self.name, 'Nacking event', { event_id: event.eventId })
                            res.statusCode = 500

                        } else {
                            self.logger.debug(self.name, 'Acking event', { event_id: event.eventId })
                            res.statusCode = 200
                        }

                        res.end()
                    })

                    self.emit('event', event)
                }
            )
        })

        req.on('data', (data) => {
            body.push(data)
        })
    })
}
