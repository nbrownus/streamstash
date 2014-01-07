var util = require('util')

var RELPSyslog = function (options) {
    var useOptions = options || {}

    this.facilityNames = util._extend(
        [
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
        ]
      , useOptions.facilityNames
    )

    this.severityNames = util._extend(
        [
            'emergency',
            'alert',
            'critical',
            'error',
            'warning',
            'notice',
            'info',
            'debug'
        ]
      , useOptions.severityNames
    )
}

module.exports = RELPSyslog

RELPSyslog.prototype.decode = function (event, callback) {
    //TODO: Add some more error checking and make sure we record our outcome in the event somehow
    var message = event.data.message

    event.data.originalMessage = message

    if (message[0] !== '<') {
        return callback()
    }

    var nextPos = message.indexOf('>')
    if (nextPos < 1 || nextPos > 4) {
        return callback()
    }

    var priority = parseInt(message.substring(1, nextPos))
    if (priority > 191) {
        return callback()
    }

    //Parse out the priority values
    event.data.priority = priority
    event.data.facility = parseInt(priority / 8, 10)
    event.data.severity = priority - (event.data.facility * 8)

    event.data.facilityName = this.facilityNames[event.data.facility]
    event.data.severityName = this.severityNames[event.data.severity]

    //Parse out the date string
    //TODO: Better date support
    var lastPos = nextPos + 1
    nextPos = message.indexOf(' ', lastPos)
    event.timestamp = new Date(message.substring(lastPos, nextPos))

    //Parse out the host
    lastPos = nextPos + 1
    nextPos = message.indexOf(' ', lastPos)
    event.data.host = message.substring(lastPos, nextPos)

    //Parse out the service
    lastPos = nextPos + 1
    nextPos = message.indexOf(':', nextPos)
    event.data.service = message.substring(lastPos, nextPos)

    //Parse out the message
    lastPos = nextPos + 2
    event.data.message = message.substring(lastPos)

    callback()
}