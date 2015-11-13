/**
 * Takes input from stdin and outputs event objects to stdout
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/basic.js
 *
 * Type a message and hit enter
 */
var util = require('util')

//Pause all inputs if the number of in process events exceeds the highWatermark
streamStash.highWaterMark = 1000

//Unpause all inputs after the number of in process events drops below lowWatermark
streamStash.lowWatermark = 100

addInputPlugin('stdin')

addOutputPlugin('stdout')

addFilter(function (event) {
    var data

    try {
        data = JSON.parse(event.data.message)
        event.data = util._extend(event.data, data)
        event.data.message = event.data['@message']
        delete event.data.originalMessage

    } catch (error) {
        event.data['@type'] = 'unparsable'
    }

    event.data.filter1 = true

    event.next()
})

addFilter(function (event) {
    event.data.filter2 = true

    event.next()
})
