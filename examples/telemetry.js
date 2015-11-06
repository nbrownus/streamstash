/**
 * Just like basic.js but with telemetry enabled
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/telemetry.js
 *
 * You may want to run a netcat server to see the telemetry output
 *
 *      nc -w0 -kul localhost 8181
 */
var util = require('util')

telemetry('localhost', 8181)

addInputPlugin('stdin')

addOutputPlugin('stdout')

addFilter(function (event) {
    setTimeout(function () { event.next() }, Math.floor(Math.random() * (1000)))
})
