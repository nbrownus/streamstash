var Logger = require('../').Logger

require('should')

describe('Logger', function () {

    it('Should have constant constants', function () {
        Logger.LEVEL.OFF.should.equal(-1, 'Off level was wrong')
        Logger.LEVEL.ERROR.should.equal(0, 'Error level was wrong')
        Logger.LEVEL.INFO.should.equal(1, 'Info level was wrong')
        Logger.LEVEL.DEBUG.should.equal(2, 'Debug level was wrong')

        Logger.NAMES[Logger.LEVEL.ERROR].should.equal('ERROR', 'Error name was wrong')
        Logger.NAMES[Logger.LEVEL.INFO].should.equal('INFO', 'Info name was wrong')
        Logger.NAMES[Logger.LEVEL.DEBUG].should.equal('DEBUG', 'Debug name was wrong')
    })

    describe('Constructor', function () {

        it('Should set the log level to INFO if level is not provided', function () {
            var logger = new Logger()
            logger.level.should.equal(Logger.LEVEL.INFO, 'Default log level was wrong')
        })

        it('Should use process.stdout if stream is not provided', function () {
            var logger = new Logger()
            logger.stream.should.equal(process.stdout, 'Default stream was wrong')
        })

        it('Should allow level to be overridden', function () {
            var logger = new Logger({ level: Logger.LEVEL.DEBUG })
            logger.level.should.equal(Logger.LEVEL.DEBUG, 'Log level override was not respected')
        })

        it('Should allow stream to be overridden', function () {
            var stream = {}
              , logger = new Logger({ stream: stream })

            logger.stream.should.equal(stream, 'Stream override was not respected')
        })

    })

    it('Should not log anything if level is OFF', function () {
        var stream = { write: function () { throw new Error('Log was written') }}
          , logger = new Logger({ level: Logger.LEVEL.OFF, stream: stream })

        logger.error('error')
        logger.info('info')
        logger.debug('debug')
    })

    it('Should prefix all messages with `[date] LEVEL `', function () {
        var level = Logger.NAMES[Logger.LEVEL.ERROR]
          , stream = {
                write: function (message) {
                    var regex = new RegExp(
                        '\\[\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+Z\\] ' + level + ' test'
                    )
                    message.should.match(regex)
                }
            }
          , logger = new Logger({ level: Logger.LEVEL.DEBUG, stream: stream })

        level = Logger.NAMES[Logger.LEVEL.ERROR]
        logger.error('test')

        level = Logger.NAMES[Logger.LEVEL.INFO]
        logger.info('test')

        level = Logger.NAMES[Logger.LEVEL.DEBUG]
        logger.debug('test')
    })

    it('Should format the message properly if multiple arguments were passed', function () {
        var level = Logger.NAMES[Logger.LEVEL.ERROR]
          , stream = {
                write: function (message) {
                    var regex = new RegExp(
                        '\\[\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+Z\\] ' + level + ' 1st 2nd'
                    )
                    message.should.match(regex)
                }
            }
          , logger = new Logger({ level: Logger.LEVEL.DEBUG, stream: stream })

        level = Logger.NAMES[Logger.LEVEL.ERROR]
        logger.error('1st', '2nd')

        level = Logger.NAMES[Logger.LEVEL.INFO]
        logger.info('1st', '2nd')

        level = Logger.NAMES[Logger.LEVEL.DEBUG]
        logger.debug('1st', '2nd')
    })

    it('Should format the message properly if multiple arguments were passed and the first is in printf style', function () {
        var level = Logger.NAMES[Logger.LEVEL.ERROR]
          , stream = {
                write: function (message) {
                    var regex = new RegExp(
                        '\\[\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+Z\\] ' + level + ' hey 2nd'
                    )
                    message.should.match(regex)
                }
            }
          , logger = new Logger({ level: Logger.LEVEL.DEBUG, stream: stream })

        level = Logger.NAMES[Logger.LEVEL.ERROR]
        logger.error('hey %s', '2nd')

        level = Logger.NAMES[Logger.LEVEL.INFO]
        logger.info('hey %s', '2nd')

        level = Logger.NAMES[Logger.LEVEL.DEBUG]
        logger.debug('hey %s', '2nd')
    })

})