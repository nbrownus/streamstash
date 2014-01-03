var util = require('util')

var Logger = function (options) {
    //TODO options.level
}

module.exports = Logger

Logger.LEVEL = {
    OFF: -1
  , ERROR: 0
  , WARN: 1 //TODO: didn't have this last time
  , INFO: 2
  , DEBUG: 3
}

Logger.prototype.error = function (mesage) {

}

//TODO: last time we didn't have a warn and there were situations where it may have been useful?
Logger.prototype.warn = function (message) {

}

Logger.prototype.info = function (message) {

}

Logger.prototype.debug = function (message) {

}

Logger.prototype._output = function (level, args) {
    //Run args through format, add timestamp and level strings
}