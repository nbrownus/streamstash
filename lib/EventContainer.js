var util = require('util'),
    EventEmitter = require('events').EventEmitter

//TODO: Allow for filters to remove outputs by name

/**
 * Wraps an event received from an input plugin and provides helpers for processing
 * Each event should at least contain message, source, and timestamp
 *
 * @param {Object} data The data received from the input
 * @param {Object} data.message Required message field
 * @param {Object} data.event_source Required details from the input plugin for this event
 *      Should at least contain the input name under `name`
 * @param {Object} data.timestamp Required timestamp field, time of the event
 *
 * @constructor
 */
var EventContainer = function (data) {
    this.data = data

    this.state = EventContainer.STATE.PROCESSING
    this.eventId = void 0

    this._emittedDone = false
    this._plugins = {}
    this._pluginsLeft = 0
}

util.inherits(EventContainer, EventEmitter)
module.exports = EventContainer

/**
 * States an event can be in
 * - FAILED: The event failed to complete processing.
 *      If the input source is reliable the event should be retried
 * - CANCELED: The event was dropped, on purpose
 * - PROCESSING: The event is still being filtered/output
 * - COMPLETED: The event has completed all processing
 *
 * @type {Object}
 */
EventContainer.STATE = {
    FAILED: -1,
    CANCELED: 0,
    PROCESSING: 1,
    COMPLETED: 2
}

/**
 * Allows a filter to progress the event to the next filter or to the output plugins
 */
EventContainer.prototype.next = function () {
    //Setup within StreamStash for speed
    return false
}

/**
 * Allows a filter to progress the event directly to the output plugins, past any other filter in the chain
 */
EventContainer.prototype.done = function () {
    //Setup within StreamStash for speed
    return false
}

/**
 * Allows a filter to cancel further processing for the event
 * The event will be completed and `state` will be canceled
 */
EventContainer.prototype.cancel = function () {
    //Setup within StreamStash for speed
    return false
}

/**
 * Marks the event as completed
 *
 * @fires EventContainer#complete For any interesting plugins to do post processing
 *
 * @returns {boolean} True of the event was marked as complete, false if already completed or invalid
 */
EventContainer.prototype.processingComplete = function () {
    if (this._emittedDone) {
        return false
    }

    this.emit('complete')
    this._emittedDone = true
    return true
}
