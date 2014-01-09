var util = require('util')
  , nginxRegex = new RegExp('^(nginx(?!-error)|lb..[ab])')
  , CombinedAccess = require('../').codecs.CombinedAccess
  , nginxCodec = new CombinedAccess({
        regex: new RegExp('^(\\S+) (\\S+) - (\\S+) \\[([^\\]]+)\\] "([A-Z]+[^"]*)" (\\d+) (\\d+) "([^"]*)" "([^"]*)"$')
      , fields: ['request_id', 'nginx.remote_host', 'nginx.user', 'timestamp', 'message', 'nginx.status_code', 'nginx.bytes', 'nginx.referrer', 'nginx.user_agent']
      , timestampField: 'timestamp'
    })

//addInputPlugin('stdin')
addInputPlugin('relp', { host: 'localhost', port: 5514 })
//addOutputPlugin('stdout')

addOutputPlugin(
    'elasticsearch'
  , {
        typeField: '@type'
      , rename: {
            //Rename the fields on output
            'message': '@message'
          , 'timestamp': '@timestamp'
            //TODO: probably should specify field values for the codec
          , 'facilityName': '@facility'
          , 'severityName': '@severity'
          , 'host': '@host'
          , 'service': '@tag'
            //Don't output these fields
            //TODO: Probably should be able to tell the codec to not give us these fields
          , 'severity': void 0
          , 'facility': void 0
          , 'priority': void 0
          , 'originalMessage':  void 0
            //This is so type isn't output twice
          , '@type': void 0
        }
    }
)

addFilter(function (event) {
    var data

    if (event.data.message.substring(0, 6) === '@json:') {
        try {
            data = JSON.parse(event.data.message.substring(6))
            event.data = util._extend(event.data, data)
            event.data.message = event.data['@message']
        } catch (error) {
            event.data['@type'] = 'unparsable'
        }

    } else if (nginxRegex.test(event.data.service)) {
        nginxCodec.decode(event, function () {
            //TODO: need to cast some things to Number
            event.data['@type'] = (event.data.nginx) ? 'nginx_access' : 'unparsable'
            event.next()
        })

        return
    }

    event.next()
})