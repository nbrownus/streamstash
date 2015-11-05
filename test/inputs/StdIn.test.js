var StreamStash = require('../../'),
    Readable = require('stream').Readable,
    StdInInput = StreamStash.inputs.StdInInput,
    EventContainer = StreamStash.EventContainer,
    Logger = StreamStash.Logger,
    EventEmitter = require('events').EventEmitter

require('should')

describe('StdInInput', function () {

    it('Should use the provided streamStash object', function () {
        var streamStash = new EventEmitter()
          , stdin = new StdInInput({ streamStash: streamStash, logger: new Logger() })

        streamStash.listeners('start').length.should.equal(1)
    })

    it('Should use the provided logger object', function () {
        var streamStash = new EventEmitter()
          , logger = {
                debug: function (message) {
                    arguments[0].should.equal('StdIn', 'message was wrong')
                    arguments[1].should.equal('starting up', 'message was wrong')
                }
            }
          , stdin = new StdInInput({ streamStash: streamStash, logger: logger })
    })

    it('Should default the name to `StdIn`', function () {
        var stdin = new StdInInput({ streamStash: new EventEmitter(), logger: new Logger() })
        stdin.name.should.equal('StdIn', 'Default name was wrong')
    })

    it('Should use the provided name', function () {
        var stdin = new StdInInput({ streamStash: new EventEmitter(), logger: new Logger(), name: 'hey' })
        stdin.name.should.equal('hey', 'name was wrong')
    })

    it('Should not emit events if not told to start', function (done) {
        var stream = new EventEmitter()
          , stdin = new StdInInput({
                streamStash: new EventEmitter()
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
            })

        stdin.on('event', function () {
            done(new Error('An event was emitted'))
        })

        stream.on('data', function () {
            done()
        })

        stream.emit('data', 'hey')
    })

    it('Should emit `started` after being told to start', function (done) {
        var streamStash = new EventEmitter()
          , stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
            })

        stdin.on('started', function () {
            done()
        })

        streamStash.emit('start')
    })

    it('Should emit `stoppedInput` after being told to stop input', function (done) {
        var streamStash = new EventEmitter()
          , stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
            })

        stdin.on('stoppedInput', function () {
            done()
        })

        streamStash.emit('start')
        streamStash.emit('stopInput')
    })

    it('Should emit `stopped` after being told to stop', function (done) {
        var streamStash = new EventEmitter()
          , stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
            })

        stdin.on('stopped', function () {
            done()
        })

        streamStash.emit('start')
        streamStash.emit('stopInput')
        streamStash.emit('stop')
    })

    it('Should emit events after being told to start', function (done) {
        var streamStash = new EventEmitter(),
            stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
            })


        stdin.on('event', function () {
            done()
        })

        streamStash.emit('start')
        stream.emit('data', 'hey')
    })

    it('Should not emit events after being told to stopInput', function (done) {
        var streamStash = new EventEmitter()
          , stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
            })

        stdin.on('event', function () {
            done(new Error('Should not have emitted an event'))
        })

        streamStash.emit('start')
        streamStash.emit('stopInput')

        stream.on('data', function () {
            done()
        })

        stream.emit('data', 'hey')
    })

    it('Should use the provided EventContainer', function (done) {
        var eventContainer = function (data) {
                data.hey = 'yay'
                return { data: data }
            }
          , streamStash = new EventEmitter()
          , stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: eventContainer
              , stream: stream
            })

        stdin.on('event', function (event) {
            event.data.hey.should.equal('yay', 'Did not use the provided EventContainer')
            done()
        })

        streamStash.emit('start')
        stream.emit('data', 'hey')
    })

    it('Should emit proper events', function (done) {
        var streamStash = new EventEmitter()
          , stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
            })

        stdin.on('event', function (event) {
            event.state.should.equal(EventContainer.STATE.PROCESSING, 'Event state was wrong')
            event.data.source.should.equal('StdIn', 'Event source was wrong')
            event.data.message.should.equal('hey', 'Event message was wrong')
            event.data.timestamp.should.instanceof(Date, 'Event timestamp was wrong')
            done()
        })

        streamStash.emit('start')
        stream.emit('data', 'hey')
    })

    it('Should add provided fields to events', function (done) {
        var streamStash = new EventEmitter()
          , stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
              , fields: {
                    added: 'yup'
                }
            })

        stdin.on('event', function (event) {
            event.data.added.should.equal('yup', 'Added field was wrong')
            done()
        })

        streamStash.emit('start')
        stream.emit('data', 'hey')
    })

    it('Should overwrite provided fields with built in events', function (done) {
        var streamStash = new EventEmitter()
          , stream = new EventEmitter()

        stream.resume = function () {}

        var stdin = new StdInInput({
                streamStash: streamStash
              , logger: new Logger()
              , EventContainer: EventContainer
              , stream: stream
              , fields: {
                    added: 'yup'
                  , message: 'overwrite'
                }
            })

        stdin.on('event', function (event) {
            event.data.added.should.equal('yup', 'Added field was wrong')
            event.data.message.should.equal('hey', 'Event message was wrong')
            done()
        })

        streamStash.emit('start')
        stream.emit('data', 'hey')
    })

})
