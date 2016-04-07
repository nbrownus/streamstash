module.exports.assertParserResult = function (parserFunc, message, data, error) {
    var result = parserFunc(message)

    if (data === void 0) {
        if (result.data !== void 0) {
            throw new Error('Expected result.data to be undefined')
        }
    } else if (result.data !== void 0) {
        result.data.should.eql(data)
    } else {
        throw new Error('Did not get any result data back')
    }

    if (error === void 0) {
        if (result.error !== void 0) {
            throw new Error('Expected result.error to be undefined')
        }
    } else {
        result.error.should.eql(error)
    }
}
