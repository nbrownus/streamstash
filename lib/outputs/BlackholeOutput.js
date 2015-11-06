var util = require('util'),
    EventEmitter = require('events').EventEmitter

/**
 * Outputs events to nowhere
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {String} [options.name='Blackhole'] A name to use for logging, must be unique to other output plugins
 *
 * @constructor
 */
var BlackholeOutput = function (options) {
    BlackholeOutput.super_.call(this)

    var self = this,
        streamStash = options.streamStash,
        logger = options.logger,
        state = 0

    self.name = options.name || 'Blackhole'

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

        self.emit('complete', eventContainer)
    })
}

BlackholeOutput.NAME = "Blackhole"
BlackholeOutput.DESCRIPTION = "Outputs events to nowhere"

util.inherits(BlackholeOutput, EventEmitter)
module.exports = BlackholeOutput
