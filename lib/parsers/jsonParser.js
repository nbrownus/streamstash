/**
 * Parses json formatted log lines
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {
    var result = { data: void 0, error: void 0 }

    try {
        result.data = JSON.parse(message)
    } catch (error) {
        result.error = error.toString()
    }

    return result
}

module.exports.propertyName = 'json'
