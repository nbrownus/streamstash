var util = require('util')
  , EventContainer = require('./EventContainer')
  , EventEmitter = require('events').EventEmitter

/*
Brain dump:
This emitted
    - start - for plugins
    - started - for consumers
    - stopInput - for input plugins
    - stop - for plugins
    - stopped - for consumers
    - output(event) - for output plugins to output an event

We listened for
    - event(eventContainer) - from input plugins
    - complete(eventContainer) - from output plugins

There was a setInterval that printed on stop how many messages were still in flight
 */

//TODO: need logs for stoppingInput and stopped plugin events
//TODO: If we got back to being provided with a constructor for plugins we could force them into domains

/**
 * Coordinates events from input plugins to filters and finally output plugins
 *
 * @param {Object} options Configuration parameters
 * @param {Logger} options.logger The logger object to use for outputting logs
 *
 * @constructor
 */
var StreamStash = function (options) {
    StreamStash.super_.call(this)

    var self = this

    self.state = StreamStash.STATE.CONFIGURING

    self.logger = options.logger

    self.inputs = []
    self.filters = []
    self.outputs = []

    self.stats = {
        startTime: null
      , events: {
            processing: 0
          , total: 0
        }
        //TODO: Not sure this is correct
      , plugins: {
            stoppedInput: 0
          , stopped: 0
          , total: 0
        }
    }

}

util.inherits(StreamStash, EventEmitter)
module.exports = StreamStash

/**
 * All the states StreamStash can be in
 * - CONFIGURING: Instantiated and ready for input/output plugins and filters to be added
 * - STARTED: Configured and ready to process events
 * - STOPPING_INPUT: Beginning to shutdown, all input plugins should not be emitting events anymore
 * - STOPPING_ALL: All inputs have stopped emitting events, waiting for in flight events and plugins to complete
 * - STOPPED: All events and plugins have completed, we are stopped
 *
 * @type {Object}
 */
StreamStash.STATE = {
    CONFIGURING: 0
  , STARTED: 1
  , STOPPING_INPUT: 2
  , STOPPING_ALL: 3
  , STOPPED: 4
}

/**
 * Adds an input plugin to provide events
 *
 * @param {Object} plugin An already instantiated input plugin
 *
 * @returns {boolean} True if the plugin was added, false if not allowed
 */
StreamStash.prototype.addInputPlugin = function (plugin) {
    var self = this

    if (self.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    plugin.once('started', function () {
        self.logger.info(plugin.name, 'started')
    })

    plugin.on('event', function (eventContainer) {
        self._handleInputEvent(eventContainer)
    })

    plugin.pluginId = self.inputs.push(plugin) - 1
    self.stats.plugins.total++

    return true
}

/**
 * Adds a filter function to use for events
 * TODO: Allow naming filters?
 * TODO: Document what is given to the filter functions
 *
 * @param {Function} func The function to use for this filter
 *
 * @returns {boolean} True if the filter was added, false if not allowed
 */
StreamStash.prototype.addFilter = function (func) {
    if (this.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    if (typeof func !== 'function') {
        throw new Error('Attempted to add a filter that is not a function')
    }

    this.filters.push(func)
    return true
}

/**
 * Adds an output plugin to use for events
 *
 * @param {Object} plugin An already instantiated output plugin
 *
 * @returns {boolean} True if the plugin was added, false if not allowed
 */
StreamStash.prototype.addOutputPlugin = function (plugin) {
    var self = this

    if (self.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    plugin.once('started', function () {
        self.logger.info(plugin.name, 'started')
    })

    plugin.on('complete', function (eventContainer) {
        self._handleOutputComplete(eventContainer)
    })

    plugin.pluginId = self.outputs.push(plugin) - 1
    self.stats.plugins.total++

    return true
}

/**
 * Starts processing events
 * At least 1 input and 1 output must be configured
 *
 * @returns {boolean} True if started, false if already started or shutting down
 *
 * @fires StreamStash#start
 */
StreamStash.prototype.start = function () {
    if (this.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    if (this.inputs.length === 0) {
        throw new Error('At least 1 input plugin must be configured')
    }

    if (this.outputs.length === 0) {
        throw new Error('At least 1 output plugin must be configured')
    }

    this.logger.info('Starting!')
    this.state = StreamStash.STATE.STARTED
    this.stats.startTime = new Date()

    this.emit('start')
    return true
}

StreamStash.prototype.stop = function () {
    if (this.state !== StreamStash.STATE.STARTED) {
        return false
    }

    var self = this
      , stoppedInput = 0
      , stopped = 0

    var waitStop = function (plugin) {
        plugin.once('stopped', function () {
            stopped++

            if (stopped === self.stats.plugins.total) {
                self.logger.info('All plugins have completely stopped')
                self.state = StreamStash.STATE.STOPPED
                self.emit('stopped')
            }
        })
    }

    self.inputs.forEach(function (input) {
        input.once('stoppedInput', function () {
            stoppedInput++

            if (stoppedInput === self.inputs.length) {
                self.logger.info('All input plugins have stopped emitting')
                self.logger.info('Waiting for', self.stats.events.processing, 'in flight events to complete')

                //TODO this if needs to be an exposed func
                if (self.stats.events.processing === 0) {
                    self.logger.info('All in flight events have completed')
                    self.logger.info('Stopping all', self.stats.plugins.total, 'plugins')
                    self.state = StreamStash.STATE.STOPPING_ALL
                    self.emit('stop')
                }
            }
        })

        waitStop(input)
    })

    self.outputs.forEach(waitStop)

    self.logger.info('Telling all input plugins to stop emitting')

    self.state = StreamStash.STATE.STOPPING_INPUT
    this.emit('stopInput')
}

/**
 * Starts an event moving through filters after being received from an input plugin
 *
 * @param {EventContainer} eventContainer The newly received event
 *
 * @returns {boolean} True if the event was taken, false if not ready for events
 *
 * @private
 */
StreamStash.prototype._handleInputEvent = function (eventContainer) {
    //TODO: Make sure eventContainer has source, message, and timestamp?

    if (this.state !== StreamStash.STATE.STARTED && this.state !== StreamStash.STATE.STOPPING_INPUT) {
        this.logger.info('Dropping event from', eventContainer.data.source)
        return false
    }

    this.stats.events.processing++
    eventContainer.eventId = this.stats.events.total++

    this._doFilter(0, eventContainer)
    return true
}

/**
 * Runs an event through the supplied filters
 * Sets up EventContainer#next, EventContainer#done, and EventContainer#cancel for each filter
 *
 * @param {Number} index Index of the filter to call, if it does not exist the event is moved to output plugins
 * @param {EventContainer} eventContainer The event to run through the filters
 *
 * @private
 */
StreamStash.prototype._doFilter = function (index, eventContainer) {
    var self = this
      , nexted = false
      , doned = false
      , canceled = false

    //No more filters, go to output
    if (!self.filters[index]) {
        return self._handleOutputEvent(eventContainer)
    }

    /**
     * Makes sure the event hasn't already progressed out of the current filter
     *
     * @returns {boolean} False if the filter has already acted, true if not
     */
    var canAct = function () {
        if (nexted) {
            self.logger.error('Filter', index, 'tried to call `next` on an event that has already progressed')
            self.logger.info(eventContainer)
            return false
        }

        if (doned) {
            self.logger.error('Filter', index, 'tried to call `done` on an event that has already progressed')
            self.logger.info(eventContainer)
            return false
        }


        if (canceled) {
            self.logger.error('Filter', index, 'tried to call `cancel` on an event that has already progressed')
            self.logger.info(eventContainer)
            return false
        }

        return true
    }

    eventContainer.next = function () {
        if (!canAct()) {
            return
        }

        nexted = true
        self._doFilter(index + 1, eventContainer)
    }

    eventContainer.done = function () {
        if (!canAct()) {
            return
        }

        doned = true
        self._handleOutputEvent(eventContainer)
    }

    eventContainer.cancel = function () {
        if (!canAct()) {
            return
        }

        canceled = true
        self._handleOutputComplete(eventContainer, true)
    }

    self.filters[index](eventContainer)
}

StreamStash.prototype._handleOutputEvent = function (eventContainer) {
    console.log('OUTPUT', eventContainer.data)
}

StreamStash.prototype._handleOutputComplete = function (eventContainer, canceled) {

}

//TODO: There were some shutdown helpers after this
