/**
 * Passthrough to the underlying statsd client.
 * If no statsd client is configured this will noop the function calls
 *
 * @param {Object} statsClient A configured stats client that implements the necessary methods
 * 
 * @constructor
 */
var Telemetry = function (statsClient) {
    this.statsClient = statsClient
}

module.exports = Telemetry

Telemetry.prototype.increment = function () {
    if (this.statsClient) {
        this.statsClient.increment.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.decrement = function () {
    if (this.statsClient) {
        this.statsClient.decrement.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.counter = function () {
    if (this.statsClient) {
        this.statsClient.counter.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.gauge = function () {
    if (this.statsClient) {
        this.statsClient.gauge.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.gaugeDelta = function () {
    if (this.statsClient) {
        this.statsClient.gaugeDelta.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.sets = function () {
    if (this.statsClient) {
        this.statsClient.sets.apply(this.statsClient, arguments)
    }
}

Telemetry.prototype.timing = function () {
    if (this.statsClient) {
        this.statsClient.timing.apply(this.statsClient, arguments)
    }
}
