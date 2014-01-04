var util = require('util')
  , EventEmitter = require('events').EventEmitter

//TODO: Allow for filters to remove outputs by name

/**
 * Wraps an event received from an input plugin and provides helpers for processing
 * Each event should at least contain message, source, and timestamp
 *
 * @param {Object} data The data received from the input
 * @param {Object} data.message Required message field
 * @param {Object} data.source Required source field, name of the plugin that provided the event
 * @param {Object} data.timestamp Required timestamp field, time of the event
 *
 * @constructor
 */
var EventContainer = function (data) {
    this.data = data

    this.state = EventContainer.STATE.PROCESSING
    this.eventId = void 0

    this._plugins = {}
    this._pluginsLeft = 0
}

util.inherits(EventContainer, EventEmitter)
module.exports = EventContainer

/**
 * States an event can be in
 * - CANCELED: The event was dropped
 * - PROCESSING: The event is still being filtered/output
 * - COMPLETE: The event has completed all processing
 *
 * @type {Object}
 */
EventContainer.STATE = {
    CANCELED: 0
  , PROCESSING: 1
  , COMPLETE: 2
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
 * @param {Boolean} [canceled=false] True if the message was canceled, false if completed normally
 *
 * @returns {boolean} True of the event was marked as complete, false if already completed or invalid
 */
EventContainer.prototype.processingComplete = function (canceled) {
    if (this.state !== EventContainer.STATE.PROCESSING) {
        return false
    }

    this.state = canceled ? EventContainer.STATE.CANCELED : EventContainer.STATE.COMPLETE
    this.emit('complete')

    return true
}
