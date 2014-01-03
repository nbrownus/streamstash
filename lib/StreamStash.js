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

StreamStash.STATE = {
    CONFIGURING: 0
  , STARTED: 1
  , STOPPING_INPUT: 2
  , STOPPING_ALL: 3
  , STOPPED: 4
}

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

StreamStash.prototype.addFilter = function (func) {
    if (this.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    if (typeof func !== 'function') {
        throw new Error('Attempted to add a filter that is not a function')
    }

    this.filters.push(func)
}

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
}

StreamStash.prototype.stop = function () {}

StreamStash.prototype._handleInputEvent = function (eventContainer) {
    //TODO: Make sure eventContainer has source, message, and timestamp?

    if (this.state !== StreamStash.STATE.STARTED && this.state !== StreamStash.STATE.STOPPING_INPUT) {
        this.logger.info('Dropping event from', eventContainer.data.source)
        return false
    }

    this.stats.events.processing++
    eventContainer.eventId = this.stats.events.total++

    this._doFilter(0, eventContainer)
}

StreamStash.prototype._doFilter = function (index, eventContainer) {
    if (eventContainer.state === EventContainer.STATE.CANCELED) {
        return
    }

    var self = this
      , nexted = false
      , doned = false

    if (!self.filters[index]) {
        return self._handleOutputEvent(eventContainer)
    }

    eventContainer.next = function () {
        // Can't call next twice in the same filter
        if (nexted) {
            //TODO: Error log, maybe this is a warn?
            return
        }

        // Can't call next if done was already called in the same filter
        if (doned) {
            //TODO: Error log, maybe this is a warn?
            return
        }

        nexted = true
        self._doFilter(index + 1, eventContainer)
    }

    eventContainer.done = function () {
        // Can't call done if next was already called in the same filter
        if (nexted) {
            //TODO: Error log, maybe this is a warn?
            return
        }

        // Can't call done twice in the same filter
        if (doned) {
            //TODO: Error log, maybe this is a warn?
            return
        }

        doned = true

        self._handleOutputEvent(eventContainer)
    }

    self.filters[index](eventContainer)
}

StreamStash.prototype._handleOutputEvent = function (eventContainer) {
    console.log('OUTPUT', eventContainer)
}

StreamStash.prototype._handleOutputComplete = function () {}

//TODO: There were some shutdown helpers after this
