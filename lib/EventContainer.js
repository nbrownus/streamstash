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

/**
 * Allows a filter to cancel further processing for the event
 * The event will be completed and `state` will be canceled
 */
EventContainer.prototype.cancel = function () {
    //Setup within StreamStash for speed
}

/**
 * Marks the event as completed
 *
 * @fires EventContainer#complete For any interesting plugins to do post processing
 *
 * @param {Boolean} canceled True if the message was canceled, false if completed normally
 *
 * @returns {boolean} True of the event was marked as complete, false if already completed or invalid
 */
EventContainer.prototype.processingComplete = function (canceled) {
    if (this.state !== EventContainer.STATE.PROCESSING || this.stage !== EventContainer.STAGE.OUTPUT) {
        return false
    }

    this.state = canceled ? EventContainer.STATE.CANCELED : EventContainer.STATE.COMPLETE
    this.emit('complete')

    return true
}
