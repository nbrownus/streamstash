var EventContainer = require('../../lib/EventContainer')

module.exports.assertParserResult = function (parserFunc, message, data, error) {
    var event = new EventContainer({ message: message }),
        result = parserFunc(event.data.message)

    if (data === void 0) {
        if (result.data !== void 0) {
            throw new Error('Expected result.data to be undefined')
        }
    } else {
        result.data.should.eql(data)
    }

    if (error === void 0) {
        if (result.error !== void 0) {
            throw new Error('Expected result.error to be undefined')
        }
    } else {
        result.error.should.eql(error)
    }
}
