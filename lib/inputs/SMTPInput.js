let util = require('util'),
    BaseInput = require('./BaseInput'),
    SMTPServer = require('smtp-server').SMTPServer,
    EventContainer = require('../EventContainer'),
    _ = require('underscore')

/**
 * Turns email received from SMTP client into events
 *
 * @param {String} options.host The host or ip address to listen on
 * @param {Number} options.port The port to listen on
 * @param {Object} options.smtpOptions A list of options for the smtp server, see https://nodemailer.com/extras/smtp-server/
 *
 * @extends BaseInput
 * @constructor
 */
let SMTPInput = function (options) {
    let useOptions = _.extend({ port: 25, host: '0.0.0.0' }, options)

    useOptions.smtpOptions = _.extend(
        {
            logger: true,
            secure: false,
            hideSTARTTLS: true,
            authOptional: true
        },
        useOptions.smtpOptions
    )

    useOptions.name = options.name || SMTPInput.NAME
    SMTPInput.super_.call(this, useOptions)

    let self = this

    useOptions.smtpOptions.onData = function (stream, session, callback) {
        self._handleInput(stream, session, callback)
    }

    try {
        self.server = new SMTPServer(useOptions.smtpOptions)
    } catch (e) {
        console.log(e)
    }

    self.server.on('error', err => {
        self.logger.error(self.name, 'SMTP Error', { error: err.stack || err })
    })

    self.logger.debug(self.name, 'starting up')

    //TODO: start on start event and not here
    self.server.listen(useOptions.port, useOptions.host)

    self.streamStash.on('start', () => {
        self.state = 1
        self.emit('started')
    })

    self.streamStash.on('stopInput', () => {
        self.state = 0
        self.emit('stoppedInput')
        //TODO: proper pause
    })

    self.streamStash.on('stop', () => {
        self.server.close(() => {
            self.emit('stopped')
        })
    })
}

SMTPInput.NAME = 'SMTP'
SMTPInput.DESCRIPTION = 'Turns email received from SMTP client into events'

util.inherits(SMTPInput, BaseInput)
module.exports = SMTPInput

SMTPInput.prototype._handleInput = function (stream, session, callback) {
    let self = this,
        buf = ''

    stream.on('data', data => {
        buf += data.toString()
    })

    stream.on('end', () => {
        self._emitEvent(buf, event => {
            event.data.smtp = {
                from: session.envelope.mailFrom.address,
                to: session.envelope.rcptTo.map(addr => addr.address),
                remoteAddress: {
                    host: session.remoteAddress,
                    port: session.remotePort,
                },
                clientHostname: session.clientHostname
            }

            event.on('complete', () => {
                self.logger.debug(self.name, 'Acking email', event.state)

                if (event.state === EventContainer.STATE.FAILED) {
                    callback(new Error('Failed to save event'))
                } else {
                    callback()
                }
            })

            self.emit('event', event)
        })
    })
}
