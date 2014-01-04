var util = require('util')
  , EventEmitter = require('events').EventEmitter

/**
 * Outputs events to stdout
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} [options.name='StdOut'] A name to use for logging, must be unique to other output plugins
 * @param [options.prettyPrint=false] True will enable pretty printing the event
 * @param [options.stream=process.stdout] The stream to write the event output to
 * @param {Object} [options.fields] Extra fields to add on each event
 * 
 * @constructor
 */
var StdOut = function (options) {
    StdOut.super_.call(this)

    var self = this
      , streamStash = options.streamStash
      , logger = options.logger
      , stream = options.stream || process.stdout
      , fields = options.fields || {}
      , indent = options.prettyPrint ? 4 : 0
      , state = 0

    self.name = options.name || 'StdOut'

    streamStash.once('start', function () {
        state = 1
        self.emit('started')
    })

    streamStash.once('stop', function () {
        state = 0
        self.emit('stopped')
    })

    streamStash.on('output', function (eventContainer) {
        var output = util._extend(fields, eventContainer.data)
        stream.write(JSON.stringify(output, 0, indent) + '\n')
        self.emit('complete', eventContainer)
    })
}

util.inherits(StdOut, EventEmitter)
module.exports = StdOut