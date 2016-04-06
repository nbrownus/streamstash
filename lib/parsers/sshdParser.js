var regexes = [
    {
        name: 'accepted_connection',
        regex: /^Accepted (\S+) for (\S+) from ((?:\d{1,3}\.){3}\d{1,3}) port (\d+) (\w+)(?:: (\S+ \S+))?/,
        parts: [ 'auth_type', 'sshd_user', 'client_ip', 'client_port', 'protocol', 'fingerprint' ]
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
        parts: [ 'auth_type', 'sshd_user', 'client_ip', 'client_port', 'protocol' ]
    },
    {
        name: 'successful_event',
        regex: /^Successful (.+) for '?(\S+?)'? from ((?:\d{1,3}\.){3}\d{1,3})(?: port (\d+) (\S+))?/,
        parts: [ 'auth_type', 'sshd_user', 'client_ip', 'client_port', 'protocol' ]
    },
    {
        name: 'fatal',
        regex: /^fatal: (.*)/,
        parts: [ 'error' ]
    },
    {
        name: 'invalid_user',
        regex: /^Invalid user (\S+) from ((?:\d{1,3}\.){3}\d{1,3})/,
        parts: [ 'sshd_user', 'client_ip' ]
    },
    {
        name: 'pam_session',
        regex: /^pam_unix\(sshd:session\): session (closed|opened) for user (\S+)/,
        parts: [ 'state', 'sshd_user' ]
    },
    {
        name: 'postponed_connection',
        regex: /^Postponed (.+) for (\S+) from ((?:\d{1,3}\.){3}\d{1,3}) port (\d+) (\S+)/,
        parts: [ 'auth_type', 'sshd_user', 'client_ip', 'client_port', 'protocol' ]
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

    data.sshd_event = matched.name
    matched.parts.forEach(function (name, index) {
        data[name] = parts[index + 1]
    })

    return { data: data, error: void 0 }
}
