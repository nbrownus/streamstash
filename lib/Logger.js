var util = require('util')

/**
 * Provides a simple logging interface
 *
 * @param {Object} options Configuration options
 * @param {Number} [options.level=Logger.INFO] Adjusts how verbose logging output is @see Logger.LEVEL
 * @param {Stream} [options.stream=process.stdout] Use a different stream to write logs to
 *
 * @constructor
 */
var Logger = function (options) {
    var useOptions = options || {}
    this.level = useOptions.level || Logger.LEVEL.WARN
    this.stream = useOptions.stream || process.stdout
}

module.exports = Logger

/**
 * Log levels
 *
 * @type {Object}
 */
Logger.LEVEL = {
    OFF: -1
  , ERROR: 0
  , INFO: 1
  , DEBUG: 2
}

/**
 * Map of levels to their names
 *
 * @type {Object}
 */
Logger.NAMES = {
    0: 'ERROR'
  , 1: 'INFO'
  , 2: 'DEBUG'
}

/**
 * Writes a critical, possibly fatal, message to the log
 *
 * @param {String...} message The message to write printf capable, there may multiple arguments, @see util.format
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.error = function (message) {
    return this._output(Logger.LEVEL.ERROR, arguments)
}

/**
 * Writes an interesting runtime information message to the log
 *
 * @param {String...} message The message to write printf capable, there may multiple arguments, @see util.format
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.info = function (message) {
    return this._output(Logger.LEVEL.INFO, arguments)
}

/**
 * Writes message that would assist in debugging the runtime to the log
 *
 * @param {String...} message The message to write printf capable, there may multiple arguments, @see util.format
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.debug = function (message) {
    return this._output(Logger.LEVEL.DEBUG, arguments)
}

/**
 * Assembles the log line and writes it
 *
 * @param {Number} level The log level of the message to write
 * @param {Object<*>} args An object containing the arguments passed to one of error, info, debug.
 *      This contains the message.
 *
 * @returns {boolean} True if the log was written, false if not
 *
 * @private
 */
Logger.prototype._output = function (level, args) {
    if (level > this.level) {
        return false
    }

    var prefix = '[' + (new Date()).toISOString() + '] ' + Logger.NAMES[level] + ' '
    this.stream.write(prefix + util.format.apply(util, args) + '\n')
}