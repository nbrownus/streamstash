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

var StreamStash = function (options) {
    StreamStash.super_.call(this)

    var self = this

    self.logger = options.logger
    self.inputs = []
    self.filters = []
    self.outputs = []

    self.stats = {
        events: {
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

StreamStash.prototype.addInputPlugin = function () {}

StreamStash.prototype.addFilter = function () {}

StreamStash.prototype.addOutputPlugin = function () {}

StreamStash.prototype.start = function () {}

StreamStash.prototype.stop = function () {}

StreamStash.prototype._handleInputEvent = function () {}

StreamStash.prototype._handleOutputEvent = function () {}

StreamStash.prototype._handleOutputComplete = function () {}

//TODO: There were some shutdown helpers after this