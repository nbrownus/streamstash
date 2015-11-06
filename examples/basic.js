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
