var StreamStash = require('../lib')

// Create a new parser that appends ' custom' to the event.data.message
// StreamStash.parsers.wrap provides the helper function that modifies
// the event directly with the parser result but makes some assumptions
StreamStash.parsers.my_custom_parser = StreamStash.parsers.wrap(
    // This is the actual custom parser function
    function (message) {
        return {
            data: {
                message: message + ' custom'
            },
            error: void 0
        }
    }
)

var testEvent = new StreamStash.EventContainer({ message: 'hi' })
StreamStash.parsers.my_custom_parser(testEvent)
// returns true
// testEvent.data is now { message: 'hi custom' }

StreamStash.parsers.my_custom_parser.raw(testEvent.data.message)
// returns { data: { message: 'hi custom' }, error: undefined }
