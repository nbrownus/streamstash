var StreamStash = require('../../')
  , RELPSyslog = StreamStash.codecs.RELPSyslog
  , EventContainer = StreamStash.EventContainer

describe.skip('Codec - RELPSyslog', function () {

    describe('decode', function () {

        it('Should decode the priority string properly', function (done) {
            var codec = new RELPSyslog()
              , event = new EventContainer({
                    message: '<86>2014-01-06T12:10:22.625376-08:00 localhost sshd[1001]: test'
                })

            codec.decode(event, function () {
                console.log(event)
            })
        })

    })

})