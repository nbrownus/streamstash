var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult,
    EventContainer = StreamStash.EventContainer

describe('parser helper wrapper', function () {

    it('Copy the data into event.data', function () {
        var event = new EventContainer({ message: '{"derp":"flerp","message":"hi"}' }),
            result = StreamStash.parsers.jsonParser(event)

        result.should.eql(true)
        event.data.should.eql({
            message: 'hi',
            json: {
                derp: 'flerp'
            }
        })

    })

    it('Should set parseError and _type on error', function () {
        var event = new EventContainer({ message: '"derp":"flerp","message":"hi"}' }),
            result = StreamStash.parsers.jsonParser(event)

        result.should.eql(false)
        event.data.should.eql({
            message: '"derp":"flerp","message":"hi"}',
            _type: 'unparseable',
            parse_error: 'json: SyntaxError: Unexpected token : in JSON at position 6'
        })
    })

    it('Should set parseError and the specified type property on error', function () {
        var event = new EventContainer({ message: '"derp":"flerp","message":"hi"}' }),
            result = StreamStash.parsers.jsonParser(event, 'customType')

        result.should.eql(false)
        event.data.should.eql({
            message: '"derp":"flerp","message":"hi"}',
            customType: 'unparseable',
            parse_error: 'json: SyntaxError: Unexpected token : in JSON at position 6'
        })
    })

    it('Should not modify event.data if no data was parsed', function () {
        var event = new EventContainer({ message: '""' }),
            result = StreamStash.parsers.jsonParser(event)

        result.should.eql(true)
        event.data.should.eql({
            message: '""'
        })
    })

})
