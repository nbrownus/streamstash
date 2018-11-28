var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult

describe('httpVHostCombinedAccessParser', function () {

    it('Should parse a regular vhost combined access log line', function () {
        assertParserResult(
            StreamStash.parsers.httpVHostCombinedAccessParser.raw,
            'thing.der.com:443 127.0.0.1 derp user_name [09/Feb/2016:13:43:01 +0800] "GET /path HTTP/1.1" 200 140 "http://referrer" "really long user agent"',
            {
                virtual_host: 'thing.der.com:443',
                bytes: '140',
                identd: 'derp',
                message: 'GET /path HTTP/1.1',
                method: 'GET',
                path: '/path',
                version: 'HTTP/1.1',
                referrer: 'http://referrer',
                remote_host: '127.0.0.1',
                status_code: '200',
                timestamp: new Date('2016-02-08 21:43:01.000 -0800'),
                user: 'user_name',
                user_agent: 'really long user agent'
            }
        )
    })

})
