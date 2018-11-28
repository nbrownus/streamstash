var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult,
    EventContainer = StreamStash.EventContainer

//TODO: should probably test all facility and severity names

describe('relpSyslogParser', function () {

    it('Should parse a proper message', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<86>2014-01-06T12:10:22.625376-08:00 localhost sshd[1001]: test',
            {
                facility: 10,
                facilityName: 'security/auth',
                host: 'localhost',
                message: 'test',
                priority: 86,
                service: 'sshd[1001]',
                severity: 6,
                severityName: 'info',
                timestamp: new Date('2014-01-06 12:10:22.625 -0800')
            }
        )
    })

    it('Should provide the proper error if not a syslog string', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            'nope',
            void 0,
            'Not a syslog message'
        )
    })

    it('Should provide the proper error if not a syslog string', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<nope',
            void 0,
            'No priority value'
        )
    })

    it('Should provide the proper error on a bad priority value', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<200>',
            void 0,
            'Invalid priority value'
        )

        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '< >',
            void 0,
            'Invalid priority value'
        )
    })

    it('Should provide the proper error on a bad date value', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<191>nope',
            void 0,
            'Invalid date'
        )

        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<191>nope ',
            void 0,
            'Invalid date'
        )
    })

    it('Should provide the proper error on a bad host', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<86>2014-01-06T12:10:22.625376-08:00 ',
            void 0,
            'Invalid host'
        )
    })

    it('Should provide the proper error on a bad service', function () {
        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<86>2014-01-06T12:10:22.625376-08:00 host ',
            void 0,
            'Invalid service'
        )

        assertParserResult(
            StreamStash.parsers.relpSyslogParser.raw,
            '<86>2014-01-06T12:10:22.625376-08:00 host asdfasd',
            void 0,
            'Invalid service'
        )
    })

})
