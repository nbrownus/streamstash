var StreamStash = require('../')
  , EventEmitter = require('events').EventEmitter
  , Logger = StreamStash.Logger

require('should')

describe('StreamStash', function () {

    it('Should have constant constants', function () {
        StreamStash.STATE.CONFIGURING.should.equal(0, 'CONFIGURING was wrong')
        StreamStash.STATE.STARTED.should.equal(1, 'STARTED was wrong')
        StreamStash.STATE.STOPPING_INPUT.should.equal(2, 'STOPPING_INPUT was wrong')
        StreamStash.STATE.STOPPING_ALL.should.equal(3, 'STOPPING_ALL was wrong')
        StreamStash.STATE.STOPPED.should.equal(4, 'STOPPED was wrong')
    })

    describe('Constructor', function () {

        it('Should start off in `configuring`', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.state.should.equal(StreamStash.STATE.CONFIGURING, 'Initial state was wrong')
        })

        it('Should set max listeners to 0', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash._maxListeners.should.equal(0, 'Max listeners was wrong')
        })

        it('Should use the provided logger', function () {
            var logger = new Logger()

            var streamStash = new StreamStash({ logger: logger })
            streamStash.logger.should.equal(logger, 'Did not use the provided logger')
        })

        it('Should initialize properties properly', function () {
            var streamStash = new StreamStash({ logger: new Logger() })

            streamStash.inputs.should.eql([], 'inputs was wrong')
            streamStash.outputs.should.eql([], 'outputs was wrong')
            streamStash.filters.should.eql([], 'filters was wrong')

            streamStash.stats.should.eql(
                {
                    startTime: null
                  , events: {
                        processing: 0
                      , total: 0
                    }
                  , plugins: {
                        started: 0
                      , stoppedInput: 0
                      , stopped: 0
                      , total: 0
                    }
                }
              , 'stats was wrong'
            )
        })

        it('Should emit telemetry every 5 seconds', function (done) {
            var streamStash = new StreamStash({ logger: new Logger(), telemetryInterval: 10 }),
                seen = 0

            streamStash.telemetry.gauge = function (metric) {
                if (metric != 'events.processing' && metric != 'events.total') {
                    throw new Error('Got a metric we did not expect')
                }

                seen++

                //This is brittle and will miss added stats
                if (seen == 2) {
                    done()
                }
            }

        })

    })

    describe('#addInputPlugin', function () {

        it('Should not add any inputs if not in `configuring` state', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.state = 2
            streamStash.addInputPlugin().should.equal(false)
        })

        it('Should throw an error if the plugin did not have a name', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
                , plugin = new EventEmitter()

            try {
                streamStash.addInputPlugin(plugin)
            } catch (error) {
                error.message.should.equal('Input plugin did not have a name')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should throw an error if the name is already used', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            plugin.name = '1'
            streamStash.addInputPlugin(plugin).should.equal(true)

            try {
                streamStash.addInputPlugin(plugin)
            } catch (error) {
                error.message.should.equal('Each input plugin must have a unique name')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should give the plugin an id, save it, and update the stats', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            plugin.name = '1'
            streamStash.addInputPlugin(plugin).should.equal(true)
            plugin.pluginId.should.equal(0, 'Plugin id was wrong')

            streamStash.inputs[0].should.equal(plugin, 'Plugin was not recorded properly')
            streamStash.stats.plugins.total.should.equal(1, 'Stats were not updated properly')

            plugin = new EventEmitter()
            plugin.name = '2'
            streamStash.addInputPlugin(plugin).should.equal(true)
            plugin.pluginId.should.equal(1, 'Plugin id was wrong')

            streamStash.inputs[1].should.equal(plugin, 'Plugin was not recorded properly')
            streamStash.stats.plugins.total.should.equal(2, 'Stats were not updated properly')
        })
    })

    describe('#addOutputPlugin', function () {

        it('Should not add any outputs if not in `configuring` state', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.state = 2
            streamStash.addOutputPlugin().should.equal(false)
        })

        it('Should throw an error if the plugin did not have a name', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            try {
                streamStash.addOutputPlugin(plugin)
            } catch (error) {
                error.message.should.equal('Input plugin did not have a name')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should throw an error if the name is already used', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            plugin.name = '1'
            streamStash.addOutputPlugin(plugin).should.equal(true)

            try {
                streamStash.addOutputPlugin(plugin)
            } catch (error) {
                error.message.should.equal('Each output plugin must have a unique name')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should give the plugin an id, save it, and update the stats', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            plugin.name = '1'
            streamStash.addOutputPlugin(plugin).should.equal(true)
            plugin.pluginId.should.equal(0, 'Plugin id was wrong')

            streamStash.outputs[0].should.equal(plugin, 'Plugin was not recorded properly')
            streamStash.stats.plugins.total.should.equal(1, 'Stats were not updated properly')

            plugin = new EventEmitter()
            plugin.name = '2'
            streamStash.addOutputPlugin(plugin).should.equal(true)
            plugin.pluginId.should.equal(1, 'Plugin id was wrong')

            streamStash.outputs[1].should.equal(plugin, 'Plugin was not recorded properly')
            streamStash.stats.plugins.total.should.equal(2, 'Stats were not updated properly')
        })
    })

    describe('#addFilter', function () {

        it('Should not add any filters if not in `configuring` state', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.state = 2
            streamStash.addFilter().should.equal(false)
        })

        it('Should not add non function filters', function () {
            var streamStash = new StreamStash({ logger: new Logger() })

            try {
                streamStash.addFilter('asf')
            } catch (error) {
                error.message.should.equal('Attempted to add a filter that is not a function')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should not allow the same filter to be added more than once', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , filter = function () {}

            streamStash.addFilter(filter)

            try {
                streamStash.addFilter(filter)
            } catch (error) {
                error.message.should.equal('Attempted to add the same filter more than once')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should record filters on successful add', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , filter = function () {}

            streamStash.addFilter(filter)
            streamStash.filters[0].should.equal(filter)

            filter = function () {}
            streamStash.addFilter(filter)
            streamStash.filters[1].should.equal(filter)
        })

    })

    describe('#start', function () {

        it('Should not start if not in `configuring` state', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.state = 2
            streamStash.start().should.equal(false)
        })

        it('Should throw an error if no inputs were configured', function () {
            var streamStash = new StreamStash({ logger: new Logger() })

            try {
                streamStash.start()
            } catch (error) {
                error.message.should.equal('At least 1 input plugin must be configured')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should throw an error if no inputs were configured', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()

            plugin.name = '1'
            streamStash.addInputPlugin(plugin)

            try {
                streamStash.start()
            } catch (error) {
                error.message.should.equal('At least 1 output plugin must be configured')
                return
            }

            return new Error('Should have had an error')
        })

        it('Should start up properly', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , plugin = new EventEmitter()
              , sawStart = false

            plugin.name = '1'
            streamStash.addInputPlugin(plugin)
            streamStash.addOutputPlugin(plugin)

            streamStash.on('start', function () {
                sawStart = true
            })

            //TODO: info log assert

            streamStash.start().should.equal(true)
            streamStash.stats.startTime.should.instanceof(Date)
            streamStash.state.should.equal(StreamStash.STATE.STARTED)
            sawStart.should.equal(true)
        })

    })

    describe('#stop', function () {

        it('Should not stop if not in `started` state', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
            streamStash.stop().should.equal(false)
        })

        it('Should begin a shutdown properly', function () {
            var streamStash = new StreamStash({ logger: new Logger() })
              , sawEvent = false

            streamStash.state = StreamStash.STATE.STARTED

            streamStash.on('stopInput', function () {
                sawEvent = true
            })

            streamStash.stop().should.equal(true)
            streamStash.state.should.equal(StreamStash.STATE.STOPPING_INPUT)
            sawEvent.should.equal(true)
            //TODO: info log assert
        })

        it('Should wait for all inputs to stop then stop all plugins')

        it('Should wait for all in flight events to complete before stopping all plugins')

        it('Should properly stop once all plugins have stopped')

    })

    it('Should emit filter timing stats').skip()

})
