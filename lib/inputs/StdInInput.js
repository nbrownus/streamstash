var util = require('util'),
    BaseInput = require('./BaseInput'),
    readline = require('readline')

/**
 * Turns data received from stdin into events
 *
 * @param {Object} [options.stream=process.stdin] The stream to use for reading data from
 *
 * @extends BaseInput
 * @constructor
 */
var StdInInput = function (options) {
    var useOptions = options || {},
        buf = ''

    useOptions.name = options.name || StdInInput.NAME

    StdInInput.super_.call(this, useOptions)

    var self = this,
        stream = options.stream || process.stdin

    self.logger.debug(self.name, 'starting up')

    self.streamStash.on('start', function () {
        self.state = 1
        stream.resume()
        self.emit('started')
    })

    self.streamStash.on('stopInput', function () {
        self.state = 0
        stream.pause()
        self.emit('stoppedInput')
    })

    self.streamStash.on('stop', function () {
        self.emit('stopped')
    })

    var rl = readline.createInterface({ input: stream })

    rl.on('line', function (line) {
        self._emitEvent(line)
    })
}

StdInInput.NAME = "StdIn"
StdInInput.DESCRIPTION = "Turns new line delimited data into events"

util.inherits(StdInInput, BaseInput)
module.exports = StdInInput
