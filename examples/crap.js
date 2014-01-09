
var RELPSyslog = require('../').codecs.RELPSyslog
  , codec = new RELPSyslog()

addInputPlugin('stdin')
addOutputPlugin('stdout')

addFilter(function (event) {
    codec.decode(event, function () {
        event.next()
    })
})
