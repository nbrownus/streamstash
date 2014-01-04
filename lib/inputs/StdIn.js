var util = require('util')
  , EventEmitter = require('events').EventEmitter

/**
 * Turns data received from stdin into events
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Function} options.EventContainer The event container constructor to use
 * @param {Object} options.logger A logger to use for logging
 * @param {String} [options.name='StdIn'] A name to use for the `source` value as well as in logging. Must be unique
 *      to other input plugins
 * @param {Object} [options.stream=process.stdin] The stream to use for reading data from
 * @param {Object} [options.fields] Extra fields to add on each event
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

    logger.debug(self.name, 'starting up')

    streamStash.once('start', function () {
        state = 1
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
