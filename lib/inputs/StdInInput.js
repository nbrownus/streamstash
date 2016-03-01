var util = require('util'),
    BaseInput = require('./BaseInput')

/**
 * Turns data received from stdin into events
 *
 * @param {Object} [options.stream=process.stdin] The stream to use for reading data from
 *
 * @extends BaseInput
 * @constructor
 */
var StdInInput = function (options) {
    var useOptions = options || {}

    useOptions.name = options.name || StdInInput.NAME

    StdInInput.super_.call(this, useOptions)

    var self = this,
        stream = options.stream || process.stdin

    self.logger.debug(self.name, 'starting up')

    self.streamStash.once('start', function () {
        self.state = 1
        stream.resume()
        self.emit('started')
    })

    self.streamStash.once('stopInput', function () {
        self.state = 0
        self.emit('stoppedInput')
    })

    self.streamStash.once('stop', function () {
        self.emit('stopped')
    })

    stream.on('data', function (data) {
        if (self.state === 0) {
            return
        }

        self._emitEvent(data.toString().trim())
    })
}

StdInInput.NAME = "StdIn"
StdInInput.DESCRIPTION = "Turns new line delimited data into events"

util.inherits(StdInInput, BaseInput)
module.exports = StdInInput
