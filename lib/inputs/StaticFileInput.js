var util = require('util'),
    BaseInput = require('./BaseInput'),
    readline = require('readline'),
    fs = require('fs')

/**
 * Consumes a single static file
 *
 * @param {String} options.file Path to the file to consume
 *
 * @extends BaseInput
 * @constructor
 */
var StaticFileInput = function (options) {
    var useOptions = options || {}

    useOptions.name = options.name || StaticFileInput.NAME

    StaticFileInput.super_.call(this, useOptions)

    if (!options.file) {
        throw new Error('A file path must be provided')
    }

    var self = this,
        rs = fs.createReadStream(options.file),
        rl = readline.createInterface({ input: rs })

    rs.on('end', function () {
        self.logger.info(self.name, 'finished consuming the file', options.file)
    })

    rs.on('error', function (error) {
        self.logger.error(self.name, 'error while consuming the file', options.file, error)
    })

    self.logger.debug(self.name, 'starting up')

    self.streamStash.on('start', function () {
        self.state = 1
        rl.resume()
        self.emit('started')
    })

    self.streamStash.on('stopInput', function () {
        self.state = 0
        rl.pause()
        self.emit('stoppedInput')
    })

    self.streamStash.on('stop', function () {
        self.state = 0
        rl.pause()
        self.emit('stopped')
    })

    rl.on('line', function (line) {
        self._emitEvent(line)
    })
}

StaticFileInput.NAME = 'StaticFile'
StaticFileInput.DESCRIPTION = 'Consumes a single static file'

util.inherits(StaticFileInput, BaseInput)
module.exports = StaticFileInput
