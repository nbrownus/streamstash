var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore')

/**
 * Base input constructor
 * <br>
 * Every input should inherit from this object
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Function} options.EventContainer The event container constructor to use
 * @param {Object} options.logger A logger to use for logging
 * @param {String} options.name A name to use for the `source` value as well as in logging. Must be unique
 *      to other input plugins
 * @param {Object} [options.fields] Extra fields to add on each event
 * @param {Object} [opotions.codec] Codec to use to decode incoming data
 *
 * @abstract
 * @constructor
 */
var BaseInput = function (options) {
    BaseInput.super_.call(this)

    this.streamStash = options.streamStash
    this.EventContainer = options.EventContainer
    this.logger = options.logger
    this.fields = options.fields || {}
    this.name = options.name
    this.state = 0
}

util.inherits(BaseInput, EventEmitter)
module.exports = BaseInput

/**
 * Helper function to create and emit a new EventContainer with the proper fields.
 *
 * @param {String} message The message for this event
 */
BaseInput.prototype._emitEvent = function (message) {
    if (this.state === 0) {
        return
    }

    var self = this,
        eventData = _.extend(
            {},
            self.fields,
            { source: self.name, timestamp: new Date(), message: message }
        ),
        event = new self.EventContainer(eventData)

    //TODO: not sold on this codec thing
    if (self.codec) {
        self.codec.decode(event, function () {
            self.emit('event', event)
        })
    } else {
        self.emit('event', event)
    }
}
