var util = require('util')
  , regex = new RegExp('^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([A-Z]+)[^"]*" \\d+ \\d+ "[^"]*" "([^"]*)"$')
  , fields = ['remote_host', 'identd', 'user', 'timestamp', 'message', 'status_code', 'bytes', 'referrer', 'user_agent']


//TODO: Really need a way to let filters know if this succeeded

var CombinedAccess = function (options) {
    var useOptions = options || {}

    this.regex = useOptions.regex || regex
    this.fields = useOptions.fields || fields
    this.timestampField = useOptions.timestampField
}

module.exports = CombinedAccess

CombinedAccess.prototype.decode = function (event, callback) {
    var message = event.data.message
      , useField
      , data

    if (this.node) {
        event.data[this.node] = {}
        node = event.data[this.node]
    }

    if (!event.data.originalMessage) {
        event.data.originalMessage = message
    }

    data = this.regex.exec(message)
    if (!data) {
        return callback()
    }

    for (var index = 1; index <= data.length; index++) {
        var value = data[index]
          , field = this.fields[index - 1]
          , node = event.data

        if (!value || value == '-' || !field) {
            continue
        }

        useField = field

        //TODO: kinda junky but allows for dot notation
        var parts = field.split('.')
        for (var partIndex = 1; partIndex < parts.length; partIndex++) {
            var partValue = parts[partIndex - 1]
            if (!node[partValue]) {
                node[partValue] = {}
            }

            node = node[partValue]
            useField = parts[partIndex]
        }

        if (field == this.timestampField) {
            //TODO: make sure this works
            var testDate = new Date(value)
            if (testDate != 'Invalid Date') {
                node[useField] = testDate
            }

        } else {
            node[useField] = value
        }

    }

    callback()
}
