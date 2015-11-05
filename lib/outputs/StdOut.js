var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore')

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

    logger.debug(self.name, 'starting up')

    streamStash.once('start', function () {
        state = 1
        self.emit('started')
    })

    streamStash.once('stop', function () {
        state = 0
        self.emit('stopped')
    })

    streamStash.on('output', function (eventContainer) {
        if (state !== 1) {
            return
        }

        var output = _.extend({}, fields, eventContainer.data)
        stream.write(JSON.stringify(output, void 0, indent) + '\n')
        self.emit('complete', eventContainer)
    })
}

StdOut.NAME = "stdout"
StdOut.DESCRIPTION = "Outputs events to stdout"

util.inherits(StdOut, EventEmitter)
module.exports = StdOut
