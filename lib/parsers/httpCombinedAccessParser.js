var regex = /^(\S+) (\S+) (\S+) \[([^\]]+)] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/,
    fields = ['remote_host', 'identd', 'user', 'timestamp', 'method', 'path', 'version', 'status_code', 'bytes', 'referrer', 'user_agent']

/**
 * Parses the common combined access log lines that an httpd outputs
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {
    var parts = [],
        data = {}

    parts = regex.exec(message)
    if (!parts) {
        return { data: void 0, error: 'No match' }
    }

    fields.forEach(function (name, index) {
        var value = parts[index + 1]

        // Skip empty values
        if (!value || value == '-') {
            return
        }

        data[name] = value
    })

    data.message = data.method + ' ' + data.path + ' ' + data.version

    var testDate = parseDate(data['timestamp'])
    if (testDate == 'Invalid Date') {
        delete data['timestamp']
        return { data: data, error: 'Invalid date' }
    } else {
        data['timestamp'] = testDate
    }

    return { data: data, error: void 0 }
}

var parseDate = function (str) {
    var parts = str.split('/'),
        day = parts[0],
        month = parts[1]

    parts = parts[2].split(':')

    var year = parts[0],
        hour = parts[1],
        min = parts[2]

    parts = parts[3].split(' ')

    var sec = parts[0],
        tz = parts[1]


    return new Date(month + ' ' + day + ', ' + year + ' ' + hour + ':' + min + ':' + sec + ' ' + tz)
}

module.exports.propertyName = 'http_combined_access'
