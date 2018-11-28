var util = require('util')

/**
 * Provides a simple logging interface
 *
 * @param {Object} options Configuration options
 * @param {Number} [options.level=Logger.INFO] Adjusts how verbose logging output is {@see Logger.LEVEL}
 * @param {Stream} [options.stream=process.stdout] Use a different stream to write logs to
 *
 * @constructor
 */
var Logger = function (options) {
    var useOptions = options || {}
    this.level = useOptions.level === void 0 ? Logger.LEVEL.INFO : useOptions.level
    this.stream = useOptions.stream || process.stdout
}

module.exports = Logger

/**
 * Log levels
 *
 * @type {Object}
 */
Logger.LEVEL = {
    OFF: -1,
    ERROR: 0,
    INFO: 1,
    DEBUG: 2
}

/**
 * Map of levels to their names
 *
 * @type {Object}
 */
Logger.NAMES = {
    0: 'ERROR',
    1: 'INFO',
    2: 'DEBUG'
}

/**
 * Writes a critical, possibly fatal, message to the log
 *
 * @param {String} name Module name that is logging the message
 * @param {String} message Simple description of the log event
 * @param {Object} [data] An object of extra information to add
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.error = function (name, message, data) {
    return this._output(Logger.LEVEL.ERROR, { name: name, message: message, data: data })
}

/**
 * Writes an interesting runtime information message to the log
 *
 * @param {String} name Module name that is logging the message
 * @param {String} message Simple description of the log event
 * @param {Object} [data] An object of extra information to add
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.info = function (name, message, data) {
    return this._output(Logger.LEVEL.INFO, { name: name, message: message, data: data })
}

/**
 * Writes message that would assist in debugging the runtime to the log
 *
 * @param {String} name Module name that is logging the message
 * @param {String} message Simple description of the log event
 * @param {Object} [data] An object of extra information to add
 *
 * @returns {boolean} True if the log was written, false if not
 */
Logger.prototype.debug = function (name, message, data) {
    return this._output(Logger.LEVEL.DEBUG, { name: name, message: message, data: data })
}

/**
 * Assembles the log line and writes it
 *
 * @param {Number} level The log level of the message to write
 * @param {Object} event An object containing at least name and message
 *
 * @returns {boolean} True if the log was written, false if not
 *
 * @private
 */
Logger.prototype._output = function (level, event) {
    if (level > this.level) {
        return false
    }

    event.timestamp = (new Date()).toISOString()
    event.level = Logger.NAMES[level]
    this.stream.write(JSON.stringify(event) + '\n')
}
