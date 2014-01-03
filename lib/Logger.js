var util = require('util')

var Logger = function (options) {
    var useOptions = options || {}
    this.level = useOptions.level || Logger.LEVEL.WARN
    this.stream = useOptions.stream || process.stdout
}

module.exports = Logger

Logger.LEVEL = {
    OFF: -1
  , ERROR: 0
  , WARN: 1 //TODO: didn't have this last time
  , INFO: 2
  , DEBUG: 3
}

Logger.NAMES = {
    0: 'ERROR'
  , 1: 'WARN'
  , 2: 'INFO'
  , 3: 'DEBUG'
}

Logger.prototype.error = function (message) {
    this._output(Logger.LEVEL.ERROR, arguments)
}

//TODO: last time we didn't have a warn and there were situations where it may have been useful?
Logger.prototype.warn = function (message) {
    this._output(Logger.LEVEL.WARN, arguments)
}

Logger.prototype.info = function (message) {
    this._output(Logger.LEVEL.INFO, arguments)
}

Logger.prototype.debug = function (message) {
    this._output(Logger.LEVEL.DEBUG, arguments)
}

Logger.prototype._output = function (level, args) {
    if (level > this.level) {
        return false
    }

    var prefix = '[' + (new Date()).toISOString() + '] ' + Logger.NAMES[level] + ' '
    this.stream.write(prefix + util.format.apply(util, args) + '\n')
}