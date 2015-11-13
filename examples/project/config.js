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
