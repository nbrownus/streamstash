var StreamStash = require('../../')
  , StdOutOutput = StreamStash.outputs.StdOutOutput
  , EventContainer = StreamStash.EventContainer
  , Logger = StreamStash.Logger
  , EventEmitter = require('events').EventEmitter

require('should')

describe('StdOutOutput', function () {
    it('Should use the provided streamStash object', function () {
        var streamStash = new EventEmitter()
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger() })

        streamStash.listeners('start').length.should.equal(1)
    })

    it('Should use the provided logger object', function () {
        var streamStash = new EventEmitter()
          , logger = {
                debug: function (message) {
                    arguments[0].should.equal('StdOut', 'message was wrong')
                    arguments[1].should.equal('starting up', 'message was wrong')
                }
            }
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: logger })
    })

    it('Should default the name to `StdOut`', function () {
        var stdout = new StdOutOutput({ streamStash: new EventEmitter(), logger: new Logger() })
        stdout.name.should.equal('StdOut', 'Default name was wrong')
    })

    it('Should use the provided name', function () {
        var stdout = new StdOutOutput({ streamStash: new EventEmitter(), logger: new Logger(), name: 'hey' })
        stdout.name.should.equal('hey', 'name was wrong')
    })

    it('Should not output any events if not told to start', function (done) {
        var streamStash = new EventEmitter()
          , stream = {
                write: function () {
                    done(new Error('Output an event'))
                }
            }
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger(), stream: stream })

        streamStash.emit('output', new EventContainer())
        done()
    })

    it('Should emit `started` after being told to start', function (done) {
        var streamStash = new EventEmitter()
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger() })

        stdout.on('started', function () {
            done()
        })

        streamStash.emit('start')
    })

    it('Should emit `stopped` after being told to stop', function (done) {
        var streamStash = new EventEmitter()
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger() })

        stdout.on('stopped', function () {
            done()
        })


        streamStash.emit('start')
        streamStash.emit('stop')
    })

    it('Should output events after told to start', function (done) {
        var streamStash = new EventEmitter()
          , stream = {
                write: function () {
                    done()
                }
            }
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger(), stream: stream })

        streamStash.emit('start')
        streamStash.emit('output', new EventContainer())
    })

    it('Should emit `complete` after outputting events', function (done) {
        var streamStash = new EventEmitter()
          , stream = { write: function () {} }
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger(), stream: stream })

        stdout.on('complete', function (event) {
            event.should.equal('yay')
            done()
        })

        streamStash.emit('start')
        streamStash.emit('output', 'yay')
    })

    it('Should add provided fields to the event', function (done) {
        var streamStash = new EventEmitter()
          , event = new EventContainer({ message: 'here' })
          , stream = {
                write: function (message) {
                    message.should.equal('{"added":"yup","message":"here"}\n', 'Output message was wrong')
                    done()
                }
            }
          , stdout = new StdOutOutput({
                streamStash: streamStash
              , logger: new Logger()
              , stream: stream
              , fields: {
                    added: 'yup'
                }
            })

        streamStash.emit('start')
        streamStash.emit('output', event)
    })

    it('Should not overwrite event fields with provided fields', function (done) {
        var streamStash = new EventEmitter()
          , event = new EventContainer({ message: 'here' })
          , stream = {
                write: function (message) {
                    message.should.equal('{"added":"yup","message":"here"}\n', 'Output message was wrong')
                    done()
                }
            }
          , stdout = new StdOutOutput({
                streamStash: streamStash
              , logger: new Logger()
              , stream: stream
              , fields: {
                    added: 'yup'
                  , message: 'overwrite'
                }
            })

        streamStash.emit('start')
        streamStash.emit('output', event)
    })

    it('Should pretty print events if configured', function (done) {
        var streamStash = new EventEmitter()
          , event = new EventContainer({ message: 'here' })
          , stream = {
                write: function (message) {
                    message.should.equal('{\n    "message": "here"\n}\n', 'Output message was wrong')
                    done()
                }
            }
          , stdout = new StdOutOutput({
                streamStash: streamStash
              , logger: new Logger()
              , stream: stream
              , prettyPrint: true
            })

        streamStash.emit('start')
        streamStash.emit('output', event)
    })

    it('Should stop outputting events when told to stop', function (done) {
        var streamStash = new EventEmitter()
          , stream = { write: function () {} }
          , stdout = new StdOutOutput({ streamStash: streamStash, logger: new Logger(), stream: stream })

        stdout.on('complete', function () {
            done(new Error('Should not have output the event'))
        })

        streamStash.emit('start')
        streamStash.emit('stop')

        streamStash.on('output', function () {
            done()
        })

        streamStash.emit('output', 'yay')
    })

})
