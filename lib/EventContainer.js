var util = require('util')
  , EventEmitter = require('events').EventEmitter

//TODO: Allow for filters to remove outputs by name

var EventContainer = function (data) {
    //TODO: wanted source, message, and timestamp
    this.data = data

    this.state = EventContainer.STATE.PROCESSING
    this.stage = EventContainer.STAGE.INPUT

    //TODO: Tracked output plugins here, was going to have a way for filters to remove specific outputs
    this._plugins = {}
    this._pluginsLeft = 0
}

util.inherits(EventContainer, EventEmitter)
module.exports = EventContainer

EventContainer.STATE = {
    CANCELED: 0
  , PROCESSING: 1
  , COMPLETE: 2
}

EventContainer.STAGE = {
    INPUT: 0
  , FILTER: 1
  , OUTPUT: 2
}

EventContainer.prototype.cancel = function () {
    if (this.state !== EventContainer.STATE.PROCESSING || this.stage !== EventContainer.STAGE.FILTER) {
        return false
    }

    this.state = EventContainer.STATE.CANCELED
    this.emit('complete')

    return true
}

EventContainer.prototype.outputComplete = function () {
    if (this.state !== EventContainer.STATE.PROCESSING || this.stage !== EventContainer.STAGE.OUTPUT) {
        return false
    }

    this.state = EventContainer.STATE.COMPLETE
    this.emit('complete')

    return true
}
