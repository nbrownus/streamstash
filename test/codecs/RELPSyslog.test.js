var StreamStash = require('../../')
  , RELPSyslog = StreamStash.codecs.RELPSyslog
  , EventContainer = StreamStash.EventContainer

describe('Codec - RELPSyslog', function () {

    describe('decode', function () {

        it('Should decode the priority string properly', function (done) {
            var codec = new RELPSyslog()
              , event = new EventContainer({
                    message: '<86>2014-01-06T12:10:22.625376-08:00 localhost sshd[1001]: test'
                })

            codec.decode(event, function () {
                event.data.should.eql({
                    message: 'test',
                    originalMessage: '<86>2014-01-06T12:10:22.625376-08:00 localhost sshd[1001]: test',
                    priority: 86,
                    facility: 10,
                    severity: 6,
                    facilityName: 'security/auth',
                    severityName: 'info',
                    timestamp: new Date('2014-01-06T12:10:22.625376-08:00'),
                    host: 'localhost',
                    service: 'sshd[1001]'
                })

                done()
            })
        })

    })

})
