var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    _ = require('underscore'),
    elasticsearch = require('elasticsearch');

/**
 * Outputs events to ElasticSearch vi REST
 *
 * @param {Object} options Configuration object
 * @param {StreamStash} options.streamStash The main stream stash object
 * @param {Object} options.logger A logger to use for logging
 * @param {Object} [options.client]  Elasticsearch javascript client config.  See Elasticdocs for what can be specified here
 * @param {Object} [options.options] Elasticsearch bulk request options see Elasticdocs for what can be specified here
 *
 * @param {Number} [options.batchSize=100] The ideal size for each batch insertion request
 * @param {Number} [options.batchTimeout=1000] The time to wait for a batch to reach `options.batchSize`. If the batch size
 *      isn't met within this time the insertion request is sent with whatever is in the current batch
 * @param {String} [options.name='ElasticSearch'] A name to use for logging, must be unique to other output plugins
 *
 * @constructor
 */
var ElasticSearchOutput = function (options) {
    ElasticSearchOutput.super_.call(this);

    var self = this,
        useOptions = options || {};

    self.logger = useOptions.logger;

    var streamStash = useOptions.streamStash;
    if (!streamStash) {
        throw new Error('The streamstash object was not provided to the constructor')
    }

    self.name = useOptions.name || 'ElasticSearch';

    self.elasticClient = new elasticsearch.Client(useOptions.client);

    self.options = useOptions.options  || {};

    self.queueOptions = {
        batchSize: useOptions.batchSize || 100,
        timeout: useOptions.batchTimeout || 1000
    };

    self.stats = {
        requests: 0,
        pendingRequests: 0
    };

    self.queue = {
        items: [],
        timer: null
    };

    self.state = 0;

    logger.debug(self.name, 'starting up');

    streamStash.once('start', function () {
        self.state = 1;
        self.emit('started');
    });

    streamStash.once('stop', function () {
        self.state = 0;

        //TODO: make sure agent has completed all requests

        self.emit('stopped');
    });

    streamStash.on('output', function (eventContainer) {
        self._handleOutput(eventContainer);
    });

    setInterval(
        function () {
            //TODO: add how long a request is taking
            streamStash.telemetry.gauge('outputs.' + self.name + '.total_requests', self.stats.requests)
            streamStash.telemetry.gauge('outputs.' + self.name + '.current_requests', self.stats.pendingRequests)
            streamStash.telemetry.gauge('outputs.' + self.name + '.current_batch_size', self.queue.items.length)
        },
        5000
    );
};

ElasticSearchOutput.NAME = "ElasticSearch";
ElasticSearchOutput.DESCRIPTION = "Outputs events to ElasticSearch via REST";

util.inherits(ElasticSearchOutput, EventEmitter);
module.exports = ElasticSearchOutput;

/**
 * Prepares and queues an event for insertion into Elasticsearch
 *
 * @param {EventContainer} eventContainer The event emitted from Streamstash
 *
 * @private
 */
ElasticSearchOutput.prototype._handleOutput = function (eventContainer) {
    if (this.state !== 1) {
        return;
    }

    var self = this;

    this.queue.items.push(eventContainer);

    if (!self.queue.timer) {
        self.queue.timer = setTimeout(
            function () {
                self._performPost(true);
            },
            self.queueOptions.timeout
        );
    }

    self._performPost();
};

/**
 * Attempts to put data into Elasticsearch
 * Will only perform the request if the queue has hit the configured batchSize limit or if the action was forced due to
 * batchTimeout firing
 *
 * @param {Boolean} [forced] Whether or not the action is being forced due to batchTimeout firing
 *
 * @private
 */
ElasticSearchOutput.prototype._performPost = function (forced) {
    var self = this;

    if (self.queue.items.length < self.queueOptions.batchSize && !forced) {
        return
    }

    //Copy the queue into here and allow a new queue to fill up
    //TODO: Clean this queueing up!
    var queue = self.queue;

    self.queue = {
        items: [],
        write: [],
        timer: null
    };

    clearTimeout(queue.timer);

    var bulkBody = [];

    for (var eventId in queue.items) {
        //TODO: if event.data[self.timestampField] does not exist we should log a warning
        var event = queue.items[eventId];
        bulkBody.push(event.data.bulkActionMeta);
        // TODO if index / update?
        bulkBody.push(event.data.message);
    }

    if(_.size(bulkBody) > 0) {
        self.elasticClient.bulk(_.extend(self.options, {body: bulkBody})).then(function(response) {
            self.stats.pendingRequests--;
            // sample response { took: 6, errors: false, items: [ { index: [Object] } ] }
            if(response.errors) {
                self.logger.error(self.name, 'Failed to write events', response.statusCode, response.errors.toString());
                self.emit('failed', queue.items);
            }
            else {
                self.emit('complete', queue.items)
            }
        }).catch(function(error) {
            self.stats.pendingRequests--;
            self.emit('failed', queue.items);
            self.logger.error(self.name, 'Error during request', error);
        });
    }
};
