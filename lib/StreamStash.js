var util = require('util')
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

    return true
}

StreamStash.prototype.start = function () {
    if (this.state !== StreamStash.STATE.CONFIGURING) {
        return false
    }

    this.logger.info('Starting!')
    this.state = StreamStash.STATE.STARTED
    this.stats.startTime = new Date()
    this.emit('start')
}

StreamStash.prototype.stop = function () {}

StreamStash.prototype._handleInputEvent = function (message) {
    console.log(message)
}

StreamStash.prototype._doFilter = function () {}

StreamStash.prototype._handleOutputEvent = function () {}

StreamStash.prototype._handleOutputComplete = function () {}

//TODO: There were some shutdown helpers after this