var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult,
    EventContainer = StreamStash.EventContainer

describe('httpCombinedAccessParser', function () {

    it('Should parse a regular combined access log line', function () {
        assertParserResult(
            StreamStash.parsers.httpCombinedAccessParser.raw,
            '127.0.0.1 derp user_name [09/Feb/2016:13:43:01 +0800] "GET /path HTTP/1.1" 200 140 "http://referrer" "really long user agent"',
            {
                bytes: '140',
                identd: 'derp',
                message: 'GET /path HTTP/1.1',
                referrer: 'http://referrer',
                remote_host: '127.0.0.1',
                status_code: '200',
                timestamp: new Date('2016-02-08 21:43:01.000 -0800'),
                user: 'user_name',
                user_agent: 'really long user agent'
            }
        )
    })

    it('Should filter out fields that had - in them', function () {
        assertParserResult(
            StreamStash.parsers.httpCombinedAccessParser.raw,
            '- - - [09/Feb/2016:13:43:01 +0800] "GET /path HTTP/1.1" 200 140 "-" "-"',
            {
                bytes: '140',
                message: 'GET /path HTTP/1.1',
                status_code: '200',
                timestamp: new Date('2016-02-08 21:43:01.000 -0800')
            }
        )
    })

    it('Should provide both data and error with a bad date', function () {
        assertParserResult(
            StreamStash.parsers.httpCombinedAccessParser.raw,
            '- - - [09/Derp/2016:13:43:01 +0800] "GET /path HTTP/1.1" 200 140 "-" "-"',
            {
                bytes: '140',
                message: 'GET /path HTTP/1.1',
                status_code: '200'
            },
            'Invalid date'
        )
    })

    it('Should have the proper error on no match', function () {
        assertParserResult(
            StreamStash.parsers.httpCombinedAccessParser.raw,
            '- - - [09/Derp/2016:13:43:01 +0800 "GET /path HTTP/1.1" 200 140 "-" "-"',
            void 0,
            'No match'
        )
    })

})
