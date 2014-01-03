var util = require('util')

var Logger = function (options) {
    var useOptions = options || {}
    this.level = useOptions.level || Logger.LEVEL.WARN
}

module.exports = Logger

Logger.LEVEL = {
    OFF: -1
  , ERROR: 0
  , WARN: 1 //TODO: didn't have this last time
  , INFO: 2
  , DEBUG: 3
}

Logger.prototype.error = function (message) {
    self._output(Logger.LEVEL.ERROR, arguments)
}

//TODO: last time we didn't have a warn and there were situations where it may have been useful?
Logger.prototype.warn = function (message) {
    self._output(Logger.LEVEL.WARN, arguments)
}

Logger.prototype.info = function (message) {
    self._output(Logger.LEVEL.INFO, arguments)
}

Logger.prototype.debug = function (message) {
    self._output(Logger.LEVEL.DEBUG, arguments)
}

Logger.prototype._output = function (level, args) {
    //Run args through format, add timestamp and level strings
}