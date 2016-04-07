var facilityNames = [
        'kernel',
        'user',
        'mail',
        'daemon',
        'security/auth',
        'syslogd',
        'line printer',
        'news',
        'uucp',
        'clock',
        'security/auth',
        'ftp',
        'ntp',
        'audit',
        'alert',
        'clock',
        'local0',
        'local1',
        'local2',
        'local3',
        'local4',
        'local5',
        'local6',
        'local7'
    ],
    severityNames = [
        'emergency',
        'alert',
        'critical',
        'error',
        'warning',
        'notice',
        'info',
        'debug'
    ]

/**
 * Parses syslog formatted log lines
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {
    var data = {}
    //TODO: more error checking

    if (message[0] !== '<') {
        return { data: void 0, error: 'Not a syslog message' }
    }

    var nextPos = message.indexOf('>')
    if (nextPos < 1 || nextPos > 4) {
        return { data: void 0, error: 'No priority value' }
    }

    data.priority = parseInt(message.substring(1, nextPos))
    if (Number.isNaN(data.priority) || data.priority > 191) {
        return { data: void 0, error: 'Invalid priority value' }
    }

    //Parse out the priority values
    data.facility = parseInt(data.priority / 8, 10)
    data.severity = data.priority - (data.facility * 8)

    data.facilityName = facilityNames[data.facility]
    data.severityName = severityNames[data.severity]

    //Parse out the date string
    var lastPos = nextPos + 1
    nextPos = message.indexOf(' ', lastPos)
    data.timestamp = new Date(message.substring(lastPos, nextPos))
    if (nextPos < 1 || data.timestamp == 'Invalid Date') {
        return { data: void 0, error: 'Invalid date' }
    }

    //Parse out the host
    lastPos = nextPos + 1
    nextPos = message.indexOf(' ', lastPos)
    if (nextPos < 1) {
        return { data: void 0, error: 'Invalid host' }
    }
    data.host = message.substring(lastPos, nextPos)

    //Parse out the service
    lastPos = nextPos + 1
    nextPos = message.indexOf(':', nextPos)
    if (nextPos < 1) {
        return { data: void 0, error: 'Invalid service' }
    }
    data.service = message.substring(lastPos, nextPos)

    //Parse out the message
    lastPos = nextPos + 2
    data.message = message.substring(lastPos)

    return { data: data, error: void 0 }
}

module.exports.propertyName = 'syslog'
