var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult,
    EventContainer = StreamStash.EventContainer

describe('jsonParser', function () {

    it('Should parse json', function () {
        assertParserResult(
            StreamStash.parsers.jsonParser.raw,
            '{"thing":{"here":["hi"]}}',
            { thing: { here: [ 'hi' ] } }
        )
    })

    it('Should have the proper error', function () {
        assertParserResult(
            StreamStash.parsers.jsonParser.raw,
            'derp',
            void 0,
            'SyntaxError: Unexpected token d in JSON at position 0'
        )
    })

})
