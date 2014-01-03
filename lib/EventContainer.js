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

/**
 * Allows a filter to progress the event to the next filter or to the output plugins
 */
EventContainer.prototype.next = function () {
    //Setup within StreamStash for speed
}

/**
 * Allows a filter to progress the event directly to the output plugins, past any other filter in the chain
 */
EventContainer.prototype.done = function () {
    //Setup within StreamStash for speed
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
