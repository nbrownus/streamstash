var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult,
    EventContainer = StreamStash.EventContainer

describe('sshdParser', function () {

    it('Should parse simple accepted_connection', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Accepted keyboard-interactive/pam for user from 10.0.0.1 port 01810 ssh2',
            {
                sshd_event: 'accepted_connection',
                auth_type: 'keyboard-interactive/pam',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: '01810',
                protocol: 'ssh2',
                fingerprint: undefined
            }
        )
    })

    it('Should parse complex accepted_connection', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Accepted publickey for user from 10.0.0.1 port 01712 ssh2: ED2-519 00:00:00:00:00:00:00:00:00:de',
            {
                sshd_event: 'accepted_connection',
                auth_type: 'publickey',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: '01712',
                protocol: 'ssh2',
                fingerprint: 'ED2-519 00:00:00:00:00:00:00:00:00:de'
            }
        )
    })

    it('Should parse bad_protocol_version', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Bad protocol version identification \'herp derp\' from 10.0.0.1 port 04617',
            {
                sshd_event: 'bad_protocol_version',
                version: 'herp derp',
                client_ip: '10.0.0.1',
                client_port: '04617'
            }
        )
    })

    it('Should parse bad_protocol_version without version', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Bad protocol version identification \'\' from 10.0.0.1 port 04617',
            {
                sshd_event: 'bad_protocol_version',
                version: undefined,
                client_ip: '10.0.0.1',
                client_port: '04617'
            }
        )
    })

    it('Should parse disconnecting', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Disconnecting: Change of username thing: (flerp,ssh-connection) -> (derp,ssh-connection) [preauth]',
            {
                sshd_event: 'disconnecting',
                reason: 'Change of username thing: (flerp,ssh-connection) -> (derp,ssh-connection) [preauth]'
            }
        )
    })

    it('Should parse no_identification', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Did not receive identification string from 10.0.0.1',
            {
                sshd_event: 'no_identification',
                client_ip: '10.0.0.1'
            }
        )
    })

    it('Should parse error', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'error: this_happened_here: that thing failed',
            {
                sshd_event: 'error',
                error: 'this_happened_here: that thing failed'
            }
        )
    })

    it('Should parse simple failed_event', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Failed Custom function for \'user\' from 10.0.0.1',
            {
                sshd_event: 'failed_event',
                auth_type: 'Custom function',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: undefined,
                protocol: undefined
            }
        )
    })

    it('Should parse complex failed_event', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Failed keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2',
            {
                sshd_event: 'failed_event',
                auth_type: 'keyboard-interactive/pam',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: '06070',
                protocol: 'ssh2'
            }
        )
    })

    it('Should parse simple successful_event', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Successful Custom function for \'user\' from 10.0.0.1',
            {
                sshd_event: 'successful_event',
                auth_type: 'Custom function',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: undefined,
                protocol: undefined
            }
        )
    })

    it('Should parse complex successful_event', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Successful keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2',
            {
                sshd_event: 'successful_event',
                auth_type: 'keyboard-interactive/pam',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: '06070',
                protocol: 'ssh2'
            }
        )
    })

    it('Should parse fatal', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'fatal: Read from socket failed: Connection reset by peer [preauth]',
            {
                sshd_event: 'fatal',
                error: 'Read from socket failed: Connection reset by peer [preauth]'
            }
        )
    })

    it('Should parse invalid_user', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Invalid user ftp from 10.0.0.1',
            {
                sshd_event: 'invalid_user',
                sshd_user: 'ftp',
                client_ip: '10.0.0.1'
            }
        )
    })

    it('Should parse pam_session opened', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'pam_unix(sshd:session): session opened for user person',
            {
                sshd_event: 'pam_session',
                sshd_user: 'person',
                state: 'opened'
            }
        )
    })

    it('Should parse pam_session closed', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'pam_unix(sshd:session): session closed for user person',
            {
                sshd_event: 'pam_session',
                sshd_user: 'person',
                state: 'closed'
            }
        )
    })

    it('Should parse postponed_connection', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Postponed keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2 [preauth]',
            {
                sshd_event: 'postponed_connection',
                auth_type: 'keyboard-interactive/pam',
                sshd_user: 'user',
                client_ip: '10.0.0.1',
                client_port: '06070',
                protocol: 'ssh2'
            }
        )
    })

    it('Should parse received_disconnect without message', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Received disconnect from 10.0.0.1: 11:  [preauth]',
            {
                sshd_event: 'received_disconnect',
                client_ip: '10.0.0.1',
                reason: undefined
            }
        )
    })

    it('Should parse received_disconnect with message', function () {
        assertParserResult(
            StreamStash.parsers.sshdParser.raw,
            'Received disconnect from 10.0.0.1: 11: things are happening [preauth]',
            {
                sshd_event: 'received_disconnect',
                client_ip: '10.0.0.1',
                reason: 'things are happening'
            }
        )
    })

    it('Should return a proper error on failure to parse', function () {
        assertParserResult(StreamStash.parsers.sshdParser.raw, 'This will not match', void 0, 'No matches')
    })

})
