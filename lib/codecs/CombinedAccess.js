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

    event.data.originalMessage = message

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
////$http_x_betable_request_id $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
//var c = new CombinedAccess({
//    regex: new RegExp('^(\\S+) (\\S+) - (\\S+) \\[([^\\]]+)\\] "([A-Z]+[^"]*)" (\\d+) (\\d+) "([^"]*)" "([^"]*)"$')
//  , fields: ['request_id', 'nginx.remote_host', 'nginx.user', 'timestamp', 'message', 'nginx.status_code', 'nginx.bytes', 'nginx.referrer', 'nginx.user_agent']
//  , timestampField: 'timestamp'
//})
//
//var event = {
//    data: {
//        message: 'sj7LtGQ97dJI6TzGaqLj_0 10.177.67.234 - betable-staging [2014-01-09T19:09:37+00:00] "POST /games/nAvHFo8XojffTJ59tZ9pzc/bet?access_token=uMXjFIm9Thga5E6aHH78ek0HV0J HTTP/1.1" 400 30 "-" "-"'
//    }
//}
//
//c.decode(event, function () {
//    console.log(event)
//})