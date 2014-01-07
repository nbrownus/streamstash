
addInputPlugin('relp', { host: 'localhost', port: 5514 })
addOutputPlugin('stdout')

addOutputPlugin(
    'elasticsearch'
  , {
        rename: {
            'message': '@message'
          , 'timestamp': '@timestamp'
        }
    }
)

addFilter(function (event) {
    delete event.data.originalMessage
    delete event.data.priority

    event.data['@facility'] = event.data.facilityName
    delete event.data.facilityName
    delete event.data.facility

    event.data['@severity'] = event.data.severityName
    delete event.data.severityName
    delete event.data.severity

    event.data['@host'] = event.data.host
    delete event.data.host

    event.data['@tag'] = event.data.service
    delete event.data.service

    event.next()
})

/*
 {
 "@message":" Could no open output pipe '/dev/xconsole': No such file or directory [try http://www.rsyslog.com/e/2039 ]"
,"@timestamp":"2014-01-06T22:27:10.454Z"
,"service":"rsyslogd-2039"
,"host":"nate-ubuntu-vm"
,"severity":"error"
,"facility":"syslogd"
,"source":"RELP"
}
 */