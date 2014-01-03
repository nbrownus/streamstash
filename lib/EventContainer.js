var util = require('util')
  , EventEmitter = require('events').EventEmitter

var EventContainer = function (data) {
    //TODO: wanted source, message, and timestamp
    this.data = data

    this.state = 0 //Tracked if it was processing, canceled or completed
    this.stage = 0 //Tracked it if was in filters or outputs

    //TODO: Tracked output plugins here, was going to have a way for filters to remove specific outputs
    this._plugins = {}
    this._pluginsLeft = 0
}

util.inherits(EventContainer, EventEmitter)
module.exports = EventContainer

EventContainer.prototype.cancel = function () {
    //TODO: Can only cancel if it is in processing && filters
}

EventContainer.prototype.outputComplete = function () {
    //TODO: Can only complete if it is in processing && outputs
}
