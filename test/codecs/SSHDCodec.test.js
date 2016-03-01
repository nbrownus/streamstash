var StreamStash = require('../../')
    , SSHDCodec = StreamStash.codecs.SSHDCodec
    , EventContainer = StreamStash.EventContainer

describe.only('SSHDCodec', function () {

    describe('decode', function () {

        it('Should parse simple accepted_connection', function (done) {
            assertCodecResult(
                'Accepted keyboard-interactive/pam for user from 10.0.0.1 port 01810 ssh2',
                {
                    type: 'accepted_connection',
                    method: 'keyboard-interactive/pam',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: '01810',
                    protocol: 'ssh2',
                    key_fingerprint: undefined,
                    key_type: undefined
                },
                done
            )
        })

        it('Should parse complex accepted_connection', function (done) {
            assertCodecResult(
                'Accepted publickey for user from 10.0.0.1 port 01712 ssh2: ED2-519 00:00:00:00:00:00:00:00:00:de',
                {
                    type: 'accepted_connection',
                    method: 'publickey',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: '01712',
                    protocol: 'ssh2',
                    key_type: 'ED2-519',
                    key_fingerprint: '00:00:00:00:00:00:00:00:00:de'
                },
                done
            )
        })

        it('Should parse bad_protocol_version', function (done) {
            assertCodecResult(
                'Bad protocol version identification \'herp derp\' from 10.0.0.1 port 04617',
                {
                    type: 'bad_protocol_version',
                    version: 'herp derp',
                    ip: '10.0.0.1',
                    port: '04617'
                },
                done
            )
        })

        it('Should parse bad_protocol_version without version', function (done) {
            assertCodecResult(
                'Bad protocol version identification \'\' from 10.0.0.1 port 04617',
                {
                    type: 'bad_protocol_version',
                    version: undefined,
                    ip: '10.0.0.1',
                    port: '04617'
                },
                done
            )
        })

        it('Should parse disconnecting', function (done) {
            assertCodecResult(
                'Disconnecting: Change of username thing: (flerp,ssh-connection) -> (derp,ssh-connection) [preauth]',
                {
                    type: 'disconnecting',
                    reason: 'Change of username thing: (flerp,ssh-connection) -> (derp,ssh-connection) [preauth]'
                },
                done
            )
        })

        it('Should parse no_identification', function (done) {
            assertCodecResult(
                'Did not receive identification string from 10.0.0.1',
                {
                    type: 'no_identification',
                    ip: '10.0.0.1'
                },
                done
            )
        })

        it('Should parse error', function (done) {
            assertCodecResult(
                'error: this_happened_here: that thing failed',
                {
                    type: 'error',
                    error: 'this_happened_here: that thing failed'
                },
                done
            )
        })

        it('Should parse simple failed_event', function (done) {
            assertCodecResult(
                'Failed Custom function for \'user\' from 10.0.0.1',
                {
                    type: 'failed_event',
                    method: 'Custom function',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: undefined,
                    protocol: undefined
                },
                done
            )
        })

        it('Should parse complex failed_event', function (done) {
            assertCodecResult(
                'Failed keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2',
                {
                    type: 'failed_event',
                    method: 'keyboard-interactive/pam',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: '06070',
                    protocol: 'ssh2'
                },
                done
            )
        })

        it('Should parse simple successful_event', function (done) {
            assertCodecResult(
                'Successful Custom function for \'user\' from 10.0.0.1',
                {
                    type: 'successful_event',
                    method: 'Custom function',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: undefined,
                    protocol: undefined
                },
                done
            )
        })

        it('Should parse complex successful_event', function (done) {
            assertCodecResult(
                'Successful keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2',
                {
                    type: 'successful_event',
                    method: 'keyboard-interactive/pam',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: '06070',
                    protocol: 'ssh2'
                },
                done
            )
        })

        it('Should parse fatal', function (done) {
            assertCodecResult(
                'fatal: Read from socket failed: Connection reset by peer [preauth]',
                {
                    type: 'fatal',
                    error: 'Read from socket failed: Connection reset by peer [preauth]'
                },
                done
            )
        })

        it('Should parse invalid_user', function (done) {
            assertCodecResult(
                'Invalid user ftp from 10.0.0.1',
                {
                    type: 'invalid_user',
                    user: 'ftp',
                    ip: '10.0.0.1'
                },
                done
            )
        })

        it('Should parse pam_session opened', function (done) {
            assertCodecResult(
                'pam_unix(sshd:session): session opened for user person',
                {
                    type: 'pam_session',
                    user: 'person',
                    state: 'opened'
                },
                done
            )
        })

        it('Should parse pam_session closed', function (done) {
            assertCodecResult(
                'pam_unix(sshd:session): session closed for user person',
                {
                    type: 'pam_session',
                    user: 'person',
                    state: 'closed'
                },
                done
            )
        })

        it('Should parse postponed_connection', function (done) {
            assertCodecResult(
                'Postponed keyboard-interactive/pam for user from 10.0.0.1 port 06070 ssh2 [preauth]',
                {
                    type: 'postponed_connection',
                    method: 'keyboard-interactive/pam',
                    user: 'user',
                    ip: '10.0.0.1',
                    port: '06070',
                    protocol: 'ssh2'
                },
                done
            )
        })

        it('Should parse received_disconnect without message', function (done) {
            assertCodecResult(
                'Received disconnect from 10.0.0.1: 11:  [preauth]',
                {
                    type: 'received_disconnect',
                    ip: '10.0.0.1',
                    reason: undefined
                },
                done
            )
        })

        it('Should parse received_disconnect with message', function (done) {
            assertCodecResult(
                'Received disconnect from 10.0.0.1: 11: things are happening [preauth]',
                {
                    type: 'received_disconnect',
                    ip: '10.0.0.1',
                    reason: 'things are happening'
                },
                done
            )
        })

    })

})

var assertCodecResult = function (message, expected, done) {
    var codec = new SSHDCodec(),
        event = new EventContainer({ message: message })

    codec.decode(event, function () {
        event.data.sshd.should.eql(expected)
        done()
    })
}
