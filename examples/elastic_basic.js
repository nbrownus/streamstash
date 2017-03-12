/**
 * Takes input from stdin and outputs event objects to stdout
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/basic.js
 *
 * Type a message and hit enter
 */

//Pause all inputs if the number of in process events exceeds the highWatermark
streamStash.highWaterMark = 1000

//Unpause all inputs after the number of in process events drops below lowWatermark
streamStash.lowWatermark = 100

addInputPlugin('stdin')

addOutputPlugin( 'elasticsearch',
    {
        batchSize: 1,
        name: 'main-es',
        client: {
            host: 'http://localhost:9200',
            log: 'trace'
        },
        options: {
            _source: false
        }
    }
);

addFilter(function (event) {
    // parsers is a global object containing all parsers built into StreamStash
    // If the parser fails event.data will contain `@type` set to 'unparseable' and `parseError` will be
    // the reason the parser failed
    // If the parser succeeds the original message will be backed up in event.data.originalMessage
    // The third argument controls whether or not the original message is backed up,
    // set it to false or don't provide it to disable the feature
    if (!parsers.jsonParser(event, '@type', true)) {
        return event.done()
    }

    var _type = 'foo',
        timestamp = new Date(),
        dateString = timestamp.getFullYear(),
        month = timestamp.getMonth() + 1,
        day = timestamp.getDate();
    dateString += '.' + ((String(month).length == 1) ? '0' + month : month)
    dateString += '.' + ((String(day).length == 1) ? '0' + day : day)

    event.data.bulkActionMeta = {
        index: {
            _index: 'myindex' + '-' + dateString,
            _type: _type
        }
    };

    event.data.filter1 = true;

    event.next();
});

addFilter(function (event) {
    event.data.filter2 = true;

    event.next();
})
