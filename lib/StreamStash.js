var util = require('util'),
    EventContainer = require('./EventContainer'),
    EventEmitter = require('events').EventEmitter,
    Telemetry = require('./Telemetry'),
    uuid = require('uuid/v4')

var memoryUsage = function () {
    var mem = process.memoryUsage()
    return {
        'heap_total': mem.heapTotal,
        'heap_used': mem.heapUsed
    }
}

//Try to use the v8 module to get memory stats
try {
    var v8 = require('v8')
    memoryUsage = function () {
        return v8.getHeapStatistics()
    }
} catch (e) {}

//TODO: setInterval on shutdown to give info on how many events/plugins we are waiting on
//TODO: need logs for stoppingInput and stopped plugin events
//TODO: need started event to fire after all plugins have started
//TODO: review log levels
//TODO: Option to disable logging timestamp
//TODO: Option to enable json log line format
//TODO: record event telemetry per input/output
//TODO: ES output connection timeout

/**
 * Coordinates events from input plugins to filters and finally output plugins
 *
 * @param {Object} options Configuration parameters
 * @param {Logger} options.logger The logger object to use for outputting logs
 * @param {Number} [options.telemetryInterval=5000] Interval in ms to send telemetry
 *
 * @constructor
 */
var StreamStash = function (options) {
    StreamStash.super_.call(this)

    var self = this

    self.setMaxListeners(0)
    self.state = StreamStash.STATE.CONFIGURING

    self.logger = options.logger
    self.telemetry = new Telemetry()

    self.inputs = []
    self.filters = []
    self.outputs = []

    self.pausedInputs = false

    self.stats = {
        startTime: null,
        events: {
            processing: 0,
            canceled: 0,
            failed: 0,
            total: 0
        },
        plugins: {
            started: 0,
            stoppedInput: 0,
            stopped: 0,
            total: 0
        }
    }

    self._telemetryInterval = setInterval(
        function () {
            self.telemetry.gauge('events.processing', self.stats.events.processing)
            self.telemetry.gauge('events.total', self.stats.events.total)
            self.telemetry.gauge('events.canceled', self.stats.events.canceled)
            self.telemetry.gauge('events.failed', self.stats.events.failed)

            var mem = memoryUsage()
            Object.keys(mem).forEach(function (stat) {
                self.telemetry.gauge('process.memory.' + stat, mem[stat])
            })
        },
        options.telemetryInterval || 5000
    )

    /**
     * Pause all input plugins if the number of events being processed exceeds this number. Defaults to 100,000.<br />
     * Setting this to 0 disables the functionality
     * @type {Number}
     */
    self.highWatermark = 100000

    /**
     * Unpause all input plugins after the number of events being processed drops below this number.<br />
     * Only applies if all input plugins have already been paused. Defaults to 1,000<br/>
     * @type {Number}
     */
    self.lowWatermark = 1000

    /**
     * The number of seconds to wait for the number of events being processed to drop below lowWatermark before<br/>
     * Defaults to 60 seconds
     * forcefully stopping the process
     * @type {Number}
     */
    self.pauseTimeout = 60

    /**
     * The number of seconds to wait after a shutdown request has been made before we forcefully stop the process<br />
     * Settings this to 0 disables the forceful shutdown behavior. Take note that this may hang the process indefintely if
     * the number of outstanding events never drops below the lowWatermark.<br />
     * Defaults to 30 seconds
     * @type {Number}
     */
    self.killTimeout = 30

    /**
     * A function that generates a random id. By default this is uuid v4 but can be swapped out for anything that can
     * immediately return a unique identifier. Ids should be unique across multiple instances of streamstash to avoid
     * collisions in highly scalable environments.
     * @type {Function}
     */
    self.idGen = uuid
}

util.inherits(StreamStash, EventEmitter)
module.exports = StreamStash

/**
 * All the states StreamStash can be in<br />
 * - CONFIGURING: Instantiated and ready for input/output plugins and filters to be added<br />
 * - STARTED: Configured and ready to process events<br />
 * - STOPPING_INPUT: Beginning to shutdown, all input plugins should not be emitting events anymore<br />
 * - STOPPING_ALL: All inputs have stopped emitting events, waiting for in flight events and plugins to complete<br />
 * - STOPPED: All events and plugins have completed, we are stopped<br />
 *
 * @type {Object}
 */
StreamStash.STATE = {
    CONFIGURING: 0,
    STARTED: 1,
    STOPPING_INPUT: 2,
    STOPPING_ALL: 3,
    STOPPED: 4
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

    if (plugin.hasOwnProperty('name') === false) {
        throw new Error('Input plugin did not have a name')
    }

    if (self._uniqueName(self.inputs, plugin) === false) {
        throw new Error('Each input plugin must have a unique name', plugin.name)
    }

    plugin.once('started', function () {
        self.logger.info(plugin.name, 'started')
        self.stats.plugins.started++
    })

    plugin.on('event', function (eventContainer) {
        self._handleInputEvent(plugin, eventContainer)
    })

    plugin.pluginId = self.inputs.push(plugin) - 1
    self.stats.plugins.total++

    return true
}

/**
 * Adds a filter function to use for events
 * TODO: Document what is given to the filter functions
 *
 * @param {String} [name] Name of the filter, will show in telemetry, among other places.
 *      Avoid using `.` unless you want your telemetry to be all screwy
 * @param {Function} func The function to use for this filter
 *
 * @returns {boolean} True if the filter was added, false if not allowed
 */
StreamStash.prototype.addFilter = function (name, func) {
    var useFunc = func,
        useName = name

    if (this.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    // Backwards compat for no name filters
    if (typeof name === 'function') {
        useFunc = name
        useName = void 0
    }

    // Set a name if one wasn't provided
    if (!useName) {
        useName = this.filters.length
    }

    if (typeof useFunc !== 'function') {
        throw new Error('Attempted to add a filter that is not a function')
    }

    this.filters.forEach(function (filter) {
        if (filter.func === useFunc) {
            throw new Error('Attempted to add the same filter more than once')
        }
    })

    this.filters.push({ func: useFunc, name: useName })
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

    if (plugin.hasOwnProperty('name') === false) {
        throw new Error('Input plugin did not have a name')
    }

    if (self._uniqueName(self.outputs, plugin) === false) {
        throw new Error('Each output plugin must have a unique name', plugin.name)
    }

    plugin.once('started', function () {
        self.logger.info(plugin.name, 'started')
        self.stats.plugins.started++
    })

    plugin.on('complete', function (eventContainer) {
        self._handleOutputComplete(plugin, eventContainer)
    })

    plugin.on('failed', function (eventContainer) {
        self._handleOutputComplete(plugin, eventContainer, EventContainer.STATE.FAILED)
    })

    plugin.pluginId = self.outputs.push(plugin) - 1
    self.stats.plugins.total++

    return true
}

StreamStash.prototype.enableTelemetry = function (statsClient) {
    this.telemetry.statsClient = statsClient
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

    this.logger.info('StreamStash', 'Starting!')
    this.state = StreamStash.STATE.STARTED
    this.stats.startTime = new Date()

    this.emit('start')
    return true
}

/**
 * Kicks off the stop sequence
 * Use this to shutdown gracefully
 *
 * @returns {boolean} True if the stop has begun, false if not allowed
 */
StreamStash.prototype.stop = function () {
    if (this.state !== StreamStash.STATE.STARTED) {
        return false
    }

    var self = this

    var waitStop = function (plugin) {
        plugin.once('stopped', function () {
            self.stats.plugins.stopped++

            if (self.stats.plugins.stopped === self.stats.plugins.total) {
                //TODO: need to make sure all in flights have completed
                self.logger.info('StreamStash', 'All plugins have completely stopped')
                self.state = StreamStash.STATE.STOPPED
                clearTimeout(self._killTimer)
                self.emit('stopped')
            }
        })
    }

    self.inputs.forEach(function (input) {
        input.once('stoppedInput', function () {
            self.stats.plugins.stoppedInput++

            if (self.stats.plugins.stoppedInput === self.inputs.length) {
                self.logger.info('StreamStash', 'All input plugins have stopped emitting')
                self.logger.info('StreamStash', 'Waiting for ' + self.stats.events.processing + ' in flight events to complete')
                self._attemptStop()
            }
        })

        waitStop(input)
    })

    self.outputs.forEach(waitStop)

    self.logger.info('StreamStash', 'Telling all input plugins to stop emitting')
    self.state = StreamStash.STATE.STOPPING_INPUT
    this.emit('stopInput')
    return true
}

/**
 * Starts an event moving through filters after being received from an input plugin
 *
 * @param {Object} plugin The plugin that provided the event
 * @param {EventContainer} eventContainer The newly received event
 *
 * @returns {boolean} True if the event was taken, false if not ready for events
 *
 * @private
 */
StreamStash.prototype._handleInputEvent = function (plugin, eventContainer) {
    var self = this

    if (self.state !== StreamStash.STATE.STARTED && self.state !== StreamStash.STATE.STOPPING_INPUT) {
        self.logger.info('StreamStash', 'Dropping event from ' + eventContainer.data.source)
        return false
    }

    if (!eventContainer.data.hasOwnProperty('event_source')) {
        self.logger.error('StreamStash', 'Event received from ' + plugin.name + ' has no event_source property')
    }

    if (!eventContainer.data.hasOwnProperty('message')) {
        self.logger.error('StreamStash', 'Event received from ' + plugin.name + ' has no message property')
    }

    self.stats.events.processing++

    eventContainer._pluginsLeft = self.outputs.length
    eventContainer.eventId = self.idGen()

    self.stats.events.total++

    if (self.pausedInputs === false && self.stats.events.processing > self.highWatermark && self.highWatermark > 0) {
        self.pausedInputs = true

        if (self.pauseTimeout > 0) {
            self._pausedTimer = setTimeout(
                function () {
                    self.shutdown('Never got below low watermark of ' + self.lowWatermark)
                },
                self.pauseTimeout * 1000
            )
        }

        self.logger.info('StreamStash', 'Pausing all input plugins because we are over the high watermark of ' + self.highWatermark)
        self.emit('stopInput')
    }

    self._doFilter(0, eventContainer)
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
    var self = this,
        nexted = false,
        doned = false,
        canceled = false,
        filter = self.filters[index]

    //No more filters, go to output
    if (!filter) {
        return self._handleOutputEvent(eventContainer)
    }

    var timer = new Date()

    /**
     * Makes sure the event hasn't already progressed out of the current filter
     *
     * @returns {boolean} False if the filter has already acted, true if not
     */
    var canAct = function () {
        if (nexted) {
            self.logger.error('StreamStash', 'Filter ' + filter.name + ' tried to call `next` on an event that has already progressed', { event: eventContainer })
            return false
        }

        if (doned) {
            self.logger.error('StreamStash', 'Filter ' + filter.name + ' tried to call `done` on an event that has already progressed', { event: eventContainer })
            return false
        }


        if (canceled) {
            self.logger.error('StreamStash', 'Filter ' + filter.name + ' tried to call `cancel` on an event that has already progressed', { event: eventContainer })
            return false
        }

        self.telemetry.timing('filter.' + filter.name, timer)
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
        eventContainer.state = EventContainer.STATE.CANCELED
        self._handleProcessingComplete(eventContainer)
    }

    filter.func(eventContainer)
}

/**
 * Sends an event to the output plugins for processing
 *
 * @param {EventContainer} eventContainer The event to output
 *
 * @private
 */
StreamStash.prototype._handleOutputEvent = function (eventContainer) {
    this.logger.debug('StreamStash', 'Beginning output for event ' + eventContainer.eventId)
    this.emit('output', eventContainer)
}

/**
 * Handles an output plugin that completed outputting an event
 *
 * @param {Object} output The output plugin that completed an event
 * @param {EventContainer|EventContainer[]} eventContainers An event or array of events that were output
 * @param {Number} [state=EventContainer.STATE.COMPLETED] The state the event should be set to
 *
 * @private
 */
StreamStash.prototype._handleOutputComplete = function (output, eventContainers, state) {
    var self = this,
        events = (Array.isArray(eventContainers)) ? eventContainers : [eventContainers],
        useState = state || EventContainer.STATE.COMPLETED,
        completed = []

    for (var i = 0, len = events.length; i < len; i++) {
        var eventContainer = events[i]
        if (eventContainer._plugins[output.pluginId]) {
            self.logger.error(output.name, 'Output plugin completed the same event twice')
            return
        }

        eventContainer._plugins[output.name] = true
        eventContainer._pluginsLeft--

        self.logger.debug('StreamStash', output.name + ' completed output. ' + eventContainer._pluginsLeft + ' plugins left')
        if (eventContainer._pluginsLeft === 0 || useState === EventContainer.STATE.FAILED) {
            eventContainer.state = useState
            completed.push(eventContainer)
        }
    }

    self._handleProcessingComplete(completed)
}

/**
 * Handles completing an event entirely
 *
 * @param {EventContainer|EventContainer[]} eventContainers An event or array of events that have finished processing
 *
 * @private
 */
StreamStash.prototype._handleProcessingComplete = function (eventContainers) {
    var self = this,
        events = (Array.isArray(eventContainers)) ? eventContainers : [eventContainers]

    for (var i = 0, len = events.length; i < len; i++) {
        var eventContainer = events[i],
            stateStr

        if (!eventContainer.processingComplete()) {
            self.logger.error(
                'StreamStash',
                'Could not complete processing for event ' + eventContainer.eventId + ' because it was previously completed'
            )
            return
        }

        switch (eventContainer.state) {
            case EventContainer.STATE.CANCELED:
                self.stats.events.canceled++
                stateStr = 'canceled'
                break

            case EventContainer.STATE.FAILED:
                self.stats.events.failed++
                stateStr = 'failed'
                break

            default:
                stateStr = 'completed'
        }

        self.logger.debug('StreamStash', 'Event ' + eventContainer.eventId + ' processing ' + stateStr)
    }

    self.stats.events.processing -= events.length
    if (self.pausedInputs && self.stats.events.processing < self.lowWatermark) {
        clearTimeout(self._pausedTimer)
        self.pausedInputs = false
        self.logger.info('StreamStash', 'Resuming all input plugins because we are below the low watermark of ' + self.lowWatermark)
        self.emit('start')
    }

    //TODO: just make this a timer?
    if (self.state === StreamStash.STATE.STOPPING_INPUT) {
        self._attemptStop()
    }
}

/**
 * Attempts to emit `stop`
 * Can only succeed if all in flight events have completed
 *
 * @private
 */
StreamStash.prototype._attemptStop = function () {
    if (this.stats.events.processing === 0) {
        this.logger.info('StreamStash', 'All in flight events have completed')
        this.logger.info('StreamStash', 'Stopping all ' + this.stats.plugins.total + ' plugins')
        this.state = StreamStash.STATE.STOPPING_ALL
        this.emit('stop')
    }
}

/**
 * Attempts to stop the process. If an attempt has already been made then the process is halted immediately.
 * If the process does not stop on its own by the time this.killTimeout time passes the process will be halted.
 *
 * @param {String} forceReason The reason a force shutdown was performed, if any.
 */
StreamStash.prototype.shutdown = function (forceReason) {
    var self = this

    var forceKill = function (reason) {
        self.logger.error('StreamStash', 'Forcefully exiting. ' + reason)
        process.exit(1)
    }

    if (self._killTimer) {
        if (forceReason) {
            forceKill(forceReason)
        }
        return
    }

    self._killTimer = setTimeout(
        function () {
            forceKill('Shutdown timeout after ' + self.killTimeout + ' seconds')
        },
        self.killTimeout * 1000
    )

    self.logger.info('StreamStash', 'Forceful exit in ' + self.killTimeout + ' seconds')

    self.stop()
}

/**
 * Checks if a plugin has a unique name
 *
 * @param {Object} currentPlugins Object containing the plugins to check the name against against
 * @param {Object} testPlugin The plugin to test the existing names against
 *
 * @returns {boolean} False if not unique, true if unique
 *
 * @private
 */
StreamStash.prototype._uniqueName = function (currentPlugins, testPlugin) {
    var unique = true

    currentPlugins.some(function (plugin) {
        if (plugin.name.toLowerCase() == testPlugin.name.toLowerCase()) {
            unique = false
            return true
        }
    })

    return unique
}
