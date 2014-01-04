var EventContainer = require('../').EventContainer
    , should = require('should')

describe('EventContainer', function () {

    it('Should have constant constants', function () {
        EventContainer.STATE.should.eql(
            {
                CANCELED: 0
              , PROCESSING: 1
              , COMPLETED: 2
            }
          , 'States constant object was different'
        )
    })

    it('Should instantiate properly', function () {
        var event = new EventContainer({ things: true })
        event.data.should.eql({ things: true}, 'Data object was wrong')
        event.state.should.equal(EventContainer.STATE.PROCESSING, 'Initial state was wrong')
        should.strictEqual(void 0, event.eventId, 'Event id should be undefined')
    })

    it('Should return true if processingComplete succeeded', function () {
        var event = new EventContainer()
        event.processingComplete().should.equal(true)
    })

    it('Should emit complete on processingComplete when not canceled', function (done) {
        var event = new EventContainer()

        event.on('complete', function () {
            event.state.should.equal(EventContainer.STATE.COMPLETED, 'State was wrong')
            done()
        })

        event.processingComplete()
    })

    it('Should emit complete on processingComplete when canceled', function (done) {
        var event = new EventContainer()

        event.on('complete', function () {
            event.state.should.equal(EventContainer.STATE.CANCELED, 'State was wrong')
            done()
        })

        event.processingComplete(true)
    })

    it('Should only mark as complete if not already completed', function () {
        var event = new EventContainer()
        event.processingComplete().should.equal(true)
        event.processingComplete().should.equal(false)

        event = new EventContainer()
        event.processingComplete(true).should.equal(true)
        event.processingComplete().should.equal(false)

        event = new EventContainer()
        event.processingComplete(true).should.equal(true)
        event.processingComplete(true).should.equal(false)

        event = new EventContainer()
        event.processingComplete().should.equal(true)
        event.processingComplete(true).should.equal(false)
    })

    it('Should just return false for #next by default', function () {
        var event = new EventContainer()
        event.next().should.equal(false)
    })

    it('Should just return false for #done by default', function () {
        var event = new EventContainer()
        event.done().should.equal(false)
    })

    it('Should just return false for #cancel by default', function () {
        var event = new EventContainer()
        event.cancel().should.equal(false)
    })
})