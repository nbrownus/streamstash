var util = require('util')
  , EventEmitter = require('events').EventEmitter

/**
 * TODO:
 *
 * @param options
 * @param options.streamStash
 * @param options.logger
 * @param [options.prettyPrint]
 * @param [options.stream]
 * @param [options.fields]
 * @param [options.name]
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