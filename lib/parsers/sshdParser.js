//TODO: Starting session: command for root from 10.0.0.0 port 20720
//TODO: Connection from 10.0.0.0 port 34815 on 10.0.0.0 port 22
//TODO: Connection from 10.0.0.0 port 49210
//TODO: Partial publickey for username from 99.99.99.99 port 63259 ssh2: RSA 00:bb:0b:00:b5:88:00:77:5b:a0:00:02:53:b8:d2:2b
//TODO: Starting session: shell on pts/3 for username from 10.0.0.0 port 47627

var regexes = [
    {
        name: 'accepted_connection',
        regex: /^Accepted (\S+) for (\S+) from ((?:\d{1,3}\.){3}\d{1,3}) port (\d+) (\w+)(?:: (\S+ \S+))?/,
        parts: [ 'auth_type', 'user', 'client_ip', 'client_port', 'protocol', 'fingerprint' ]
    },
    {
        name: 'closed_connection',
        regex: /^Connection closed by ((?:\d{1,3}\.){3}\d{1,3}) (.+)?/,
        parts: [ 'client_ip' ]
    },
    {
        name: 'bad_protocol_version',
        regex: /^Bad protocol version identification '(.+)?' from ((?:\d{1,3}\.){3}\d{1,3}) port (\d+)/,
        parts: [ 'version', 'client_ip', 'client_port' ]
    },
    {
        name: 'disconnecting',
        regex: /^Disconnecting: (.*)/,
        parts: [ 'reason' ]
    },
    {
        name: 'no_identification',
        regex: /^Did not receive identification string from ((?:\d{1,3}\.){3}\d{1,3})/,
        parts: [ 'client_ip' ]
    },
    {
        name: 'error',
        regex: /^error: (.*)/,
        parts: [ 'error' ]
    },
    {
        name: 'failed_event',
        regex: /^Failed (.+) for '?(\S+?)'? from ((?:\d{1,3}\.){3}\d{1,3})(?: port (\d+) (\S+))?/,
        parts: [ 'auth_type', 'user', 'client_ip', 'client_port', 'protocol' ]
    },
    {
        name: 'successful_event',
        regex: /^Successful (.+) for '?(\S+?)'? from ((?:\d{1,3}\.){3}\d{1,3})(?: port (\d+) (\S+))?/,
        parts: [ 'auth_type', 'user', 'client_ip', 'client_port', 'protocol' ]
    },
    {
        name: 'fatal',
        regex: /^fatal: (.*)/,
        parts: [ 'error' ]
    },
    {
        name: 'invalid_user',
        regex: /^Invalid user (\S+) from ((?:\d{1,3}\.){3}\d{1,3})/,
        parts: [ 'user', 'client_ip' ]
    },
    {
        name: 'pam_session',
        regex: /^pam_unix\(sshd:session\): session (closed|opened) for user (\S+)/,
        parts: [ 'state', 'user' ]
    },
    {
        name: 'postponed_connection',
        regex: /^Postponed (.+) for (\S+) from ((?:\d{1,3}\.){3}\d{1,3}) port (\d+) (\S+)/,
        parts: [ 'auth_type', 'user', 'client_ip', 'client_port', 'protocol' ]
    },
    {
        name: 'received_disconnect',
        regex: /^Received disconnect from ((?:\d{1,3}\.){3}\d{1,3}): \d+: (.+)?(:? .+)/,
        parts: ['client_ip', 'reason']
    }
]

/**
 * Parses sshd log lines
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {
    var parts = [],
        matched,
        data = {}

    regexes.some(function (group) {
        parts = group.regex.exec(message)
        if (parts) {
            matched = group
            return true
        }
    })

    if (!matched) {
        return { data: void 0, error: 'No matches' }
    }

    data.event = matched.name
    matched.parts.forEach(function (name, index) {
        data[name] = parts[index + 1]
    })

    return { data: data, error: void 0 }
}

module.exports.propertyName = 'sshd'
