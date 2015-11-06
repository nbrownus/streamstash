/**
 * Takes input from a tcp socket server and outputs event objects to stdout
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/tcp.js
 *
 * Use netcat to send data
 *
 *      echo "Hello there!" | nc localhost 19999
 */
var util = require('util')

addInputPlugin('tcp', { port: 19999 })

addOutputPlugin('stdout')

addFilter(function (event) {
    event.next()
})
