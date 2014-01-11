//TODO: link these things to kibana

var message = require('./crap.json')
  , timestamp = new Date(message['@timestamp'])
  , http = message.http

var body = '<html>\n' +
    '<head>\n' +
    '</head>\n' +
    '<body style="font-family: \'Courier New\', monospace;">\n' +
    '<table style="border-collapse: collapse; border: 1px solid black;">\n' +
    create_row('Request-Id', message['@request_id'], '@request_id') +
    create_row('Service', message['@tag'], '@tag') +
    create_row('Host', message['@host'], '@host') +
    create_row('Time', format_date(timestamp), '@timestamp') +
    create_row('Duration', message['duration'] + 'ms') +
    '</table>\n' +
    '<pre>\n' +
    format_http_body(message.http) +
    '</pre>' +
    '</body>\n'

console.log(body)

function create_row (left, right, linkField) {
    if (linkField) {
        right = '<a href="https://next.kibana.ops.betable.com/">' + right + '</a>'
    }
    var style = 'vertical-align: top; padding: 3px; border: 1px solid black;'
    return '    <tr>\n' +
        '        <td style="text-align: right; ' + style + '"><pre>' + left + '</pre></td>\n' +
        '        <td style="' + style + '"><pre>' + right + '</pre></td>\n' +
        '    </tr>\n'
}

function format_date (date) {
    var string = ''

    function pad (str) {
        return (String(str).length == 1) ? '0' + str : str
    }

    return pad(timestamp.getUTCDay()) + '/' + pad(timestamp.getUTCMonth() + 1) + '/' + timestamp.getUTCFullYear() +
        ' ' + pad(timestamp.getUTCHours()) + ':' + pad(timestamp.getUTCMinutes()) + ':' + pad(timestamp.getUTCSeconds()) +
        '.' + timestamp.getUTCMilliseconds()
}

function format_http_body(http) {
    var body = ''
      , header

    // Format the request side
    body += '> ' + http.request.method + ' ' + http.request.url + ' HTTP/' + http.version + '\n'

    for (header in http.request.headers) {
        body += '> ' + header + ': ' + http.request.headers[header] + '\n'
    }

    body += '> \n'

    try {
        JSON.stringify(JSON.parse(http.request.body), null, 4).split('\n').forEach(function (line) {
            body += '> ' + line + '\n'
        })
    } catch (error) {
        http.request.body.split('\n').forEach(function (line) {
            body += '> ' + line + '\n'
        })
    }

    body += '\n'

    // Format the response side
    body += '< HTTP/' + http.version + ' ' + http.response.status + ' ' + http.response.reason + '\n'

    for (header in http.response.headers) {
        body += '< ' + header + ': ' + http.response.headers[header] + '\n'
    }

    body += '< \n'

    try {
        JSON.stringify(JSON.parse(http.response.body), null, 4).split('\n').forEach(function (line) {
            body += '< ' + line + '\n'
        })
    } catch (error) {
        http.response.body.split('\n').forEach(function (line) {
            body += '< ' + line + '\n'
        })
    }

    return body
}