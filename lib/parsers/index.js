var util = require('util'),
    fs = require('fs')

/**
 * Performs the parser wrapping
 *
 * @param {Function} parser The original parser to wrap
 *
 * @returns {Function} A helper function with the actual parser available under .raw
 */
var wrap = function (parser) {
    /**
     * Wraps a parser and provides some common functionality when using parsers
     * The actual parser will attempt to parse event.data.message
     *
     * If a parse error occurs the typeField will be set to the error message
     * If the parser returned data it will be merged into event.data
     *
     * @param {EventContainer} event The event to attempt to parse
     * @param {String} [typeField='_type'] The field to set in event.data on failure
     * @param {String} [propertyName] The property name to put all parsed data under, the default is the parsers
     *      configured name
     *
     * @returns {boolean} False on parse error otherwise true
     */
    var helper = function (event, typeField, propertyName) {
        var result = parser(event.data.message)

        if (result.error) {
            event.data[typeField || '_type'] = 'unparseable'
            event.data['parseError'] = result.error
            return false

        } else if (result.data) {
            event.data[propertyName || parser.propertyName || 'unknown_parser_name'] = result.data
        }

        return true
    }

    helper.raw = parser
    return helper
}

module.exports = {
    wrap: wrap,
    goAuditParser: wrap(require('./goAuditParser')),
    httpCombinedAccessParser: wrap(require('./httpCombinedAccessParser')),
    httpVHostCombinedAccessParser: wrap(require('./httpVHostCombinedAccessParser')),
    jsonParser: wrap(require('./jsonParser')),
    relpSyslogParser: wrap(require('./relpSyslogParser')),
    sshdParser: wrap(require('./sshdParser'))
}

/**
 * The result of parser execution
 *
 * @typedef {Object} parserResult
 * @property {*} data Data parsed from the event, if any
 * @property {String} error Description of the parser failure, if one occurred
 */
