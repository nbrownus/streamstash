/**
 * Wraps a server object to intercept a proxy protocol header
 * Should handle most socket servers, certainly net.Server and tls.Server
 * Proxy details are exposed on the socket as socket.proxyDetails
 *
 * @param server
 */
module.exports = function (server) {
    // We need to backup all the connection listeners to delay them until we have had a chance to remove the
    // proxy protocol heading
    var connListeners = server.listeners('connection'),
        secConnListeners = server.listeners('secureConnection')

    server.removeAllListeners('connection')
    server.removeAllListeners('secureConnection')

    server.on('secureConnection', function (tlsSocket) {
        tlsSocket.proxyDetails = tlsSocket._parent.proxyDetails

        for (var i in secConnListeners) {
            secConnListeners[i].call(secConnListeners[i], tlsSocket)
        }
    })

    server.on('connection', function (socket) {
        var emit = socket.emit,
            events = []

        socket.emit = function (event) {
            if (event != "data") {
                events.push(arguments)
            }

            if (event == 'readable') {
                var chunk = socket.read()
                if (chunk === null) {
                    chunk = new Buffer(0)
                }

                var line = chunk.toString('utf8'),
                    nextToken = line.indexOf('\r\n')

                if (nextToken < 0) {
                    throw new Error('Expected \\r\\n but did not find one')
                }

                var parts = line.slice(0, nextToken).split(' ')

                if (parts.length < 6) {
                    throw new Error('Expected 6 parts for PROXY protocol got ' + parts.length)
                }

                if (parts[0] != 'PROXY') {
                    throw new Error('Expect PROXY protocol but got ' + parts[0])
                }

                nextToken += 2

                socket.proxyDetails = {
                    protocol: parts[1],
                    clientIp: parts[2],
                    proxyIp: parts[3],
                    clientPort: parts[4],
                    proxyPort: parts[5]
                }

                socket.emit = emit

                // Put back any bytes we didn't consume
                socket.unshift(chunk.slice(nextToken))

                for (var i in connListeners) {
                    connListeners[i].call(connListeners[i], socket)
                }

                for (var i in events) {
                    emit.apply(socket, events[i])
                }

                events = []
            }
        }
    })
}
