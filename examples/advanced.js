/**
 * Takes input from rsyslog via the omrelp output plugin and outputs event objects to elasticsearch
 */

var util = require('util')

addInputPlugin(
    'relp',
    {
        host: 'localhost',
        port: 5514,
        // Rename the input, this will show in logs and in telemetry
        name: 'my-relp-input'
    }
)

addOutputPlugin(
    'elasticsearch',
    {
        typeField: '@type',
        timstampField: '@timestamp',
        hostname: 'my-es-host.com',
        port: '9200',
        batchSize: 500,
        name: 'main-es'
    }
)

addFilter(function (event) {
    var result = parsers.jsonParser(event)
    if (result === false) {
        return event.done()
    }

    // If the event message is literally 'useless' then cancel the event. The event will not be output anywhere
    if (event.data.message === 'useless') {
        return event.cancel()
    }

    // If the event came from apache2 try and parse combined access logs
    if (event.data.service === 'apache2') {
        // Every parser has a .raw that provides the result back to you instead of modifying the event directly
        var results = parsers.httpCombinedAccessParser.raw(event.data.message)
        if (results.error) {
            event.data['_type'] = 'http_unparseable'
            event.data['parseError'] = results.error
        } else {
            // Parser succeeded so attach the parsed data to a new property on the event
            event.data.http = results.data
        }
    }

    event.next()
})
