var util = require('util')
  , EventEmitter = require('events').EventEmitter

/**
 * TODO:
 *
 * @param options
 * @param options.streamStash
 * @param options.EventContainer
 * @param options.logger
 * @param [options.name]
 * @param [options.stream]
 * @param [options.fields]
 *
 * @constructor
 */
var StdIn = function (options) {
    StdIn.super_.call(this)

    var self = this
      , streamStash = options.streamStash
      , EventContainer = options.EventContainer
      , stream = options.stream || process.stdin
      , logger = options.logger
      , fields = options.fields || {}
      , state = 0

    self.name = options.name || 'StdIn'

    streamStash.once('start', function () {
        state = 1

        logger.info('')
        self.emit('started')
    })

    streamStash.once('stopInput', function () {
        state = 0
        self.emit('stoppedInput')
    })

    streamStash.once('stop', function () {
        self.emit('stopped')
    })

    stream.on('data', function (data) {
        if (state === 0) {
            return
        }

        var eventData = util._extend(fields, {
            source: self.name
          , timestamp: new Date()
          , message: data.toString().trim()
        })

        self.emit('event', new EventContainer(eventData))
    })
}

util.inherits(StdIn, EventEmitter)
module.exports = StdIn