var util = require('util')

addInputPlugin('relp', { host: 'localhost', port: 5514 })
addOutputPlugin('stdout')

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
    if (event.data.message.substring(0, 6) === '@json:') {
        try {
            var data = JSON.parse(event.data.message.substring(7))
            event.data = util._extend(event.data, data)
        } catch (error) {
            event.data['@type'] = 'unparsable'
        }
    }

    event.next()
})