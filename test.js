var message = require('./crap.json')
  , mail = require('nodemailer').mail
  , qs = require('querystring')
  , timestamp = new Date(message['@timestamp'])
  , startRange = new Date(timestamp.getTime() - (5 * 60 * 1000))
  , stopRange = new Date(timestamp.getTime() + (5 * 60 * 1000))
  , http = message.http
  , fontStyle = 'font-family: Monaco, monospace; font-size: 10pt; white-space: pre;'
  , title = ' ' + http.response.status + ' ' + message['@tag'] + ' ' + http.request.method + ' ' + http.request.url

var body = '<html>\n' +
    '<head>\n' +
    '<title>' + title + '</title>\n' +
    '</head>\n' +
    '<body style="' + fontStyle + '">' +
    '<table style="border-collapse: collapse; border: 1px solid black;">\n' +
    create_row('Request-Id', message['@request_id'], '@request_id') +
    create_row('Service', message['@tag'], '@tag') +
    create_row('Host', message['@host'], '@host') +
    create_row('Time', format_date(timestamp), false) +
    create_row('Duration', message['duration'] + 'ms') +
    '</table>\n' +
    format_http_body(message.http) +
    '</body>\n'

mail({
    from: 'Betable operations <ops@betable.com>'
  , to: 'nate@betable.com'
  , subject: title
  , html: body
})

//console.log(body)

function create_row (left, right, linkField) {
    if (linkField !== void 0) {
        var query = { from: startRange.toISOString(), to: stopRange.toISOString() }
        if (linkField !== false) {
            query.query = linkField + ':' + right
        }

        right = '<a href="https://next.kibana.ops.betable.com/#/dashboard?' + qs.stringify(query) + '">' + right + '</a>'
    }

    var style = fontStyle + 'vertical-align: top; border: 1px solid black; padding: 3px'
    return '    <tr>\n' +
        '        <td style="text-align: right; ' + style + '">' + left + '</td>\n' +
        '        <td style="' + style + '">' + right + '</td>\n' +
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