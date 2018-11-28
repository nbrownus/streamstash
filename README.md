[![Build Status](https://travis-ci.org/nbrownus/streamstash.png?branch=master)](https://travis-ci.org/nbrownus/streamstash)

### StreamStash

`streamstash` is a log aggregating, filtering, redirecting service. A lightweight [Node.js](http://nodejs.org/)
alternative to projects like [logstash](http://logstash.net/), [flume](http://flume.apache.org/),
[fluentd](http://fluentd.org/), etc.


### Usage

I typically setup a separate repo with my `config.js` and `package.json` that lists `streamstash` as a
dependency. Deploy that repo to my servers and run `npm install`. The last step is to run `streamstash`

    <PROJECT SOURCE DIR>/node_modules/streamstash/bin/streamstash <PROJECT SOURCE DIR>/config.js

An example of this can be found [here](examples/project)

### Inputs

Inputs are things that slurp event data from different places and provides them to `streamstash` for filtering
(by filters) and outputting (by outputs).

Inputs packaged with `streamstash`:

- RELP: Provides an easy and reliable integration with rsyslog. Uses [rsyslogs](http://www.rsyslog.com/) Reliable Event
    Logging Protocol. For more info see the [relp webpage](http://www.rsyslog.com/doc/relp.html)
- StdIn: Takes data received from standard input and creates events for them
- Socket: A very customizable connection oriented socket input
- StaticFile: Simple static file ingestion, main use case is to run streamstash per file you need to ingest
- SMTP: Turns email received via SMTP into events
- HTTP: Turns http requests into events.

Example usage can be found in the [examples folder](examples)

### Filters

Filters are javascript functions that allow you to modify event data or control the flow of an event through the system.

The main reason this project exists was to provide users a "real" scripting language to use when working with event
data. If you have ever tried using logstash you may have gotten irritated with trying to do anything more than basic
data manipulation, this is mainly because you were working in almost ruby but not quite.

Every event will contain the following properties in the data object:

- `source`: The input plugin that generated the event.
- `message`: The event message.
- `timestamp`: The time the event occurred or was received by the input plugin.

A simple filter example:

    addFilter(function (event) {
        // Add a gotHere property to the event data
        event.data.gotHere = 'Yay!'

        // Allow the event to progress to the next filter or on to output plugins
        event.next()
    })

A little more advanced, this one is named:

    addFilter('cool', function (event) {
        // Drop all events with a 'stupid event' message, these events will never see an output plugin
        if (event.data.message == 'stupid event') {
            // Be sure to return anytime you may continue processing the event to avoid weird issues
            return event.cancel()
        }

        // Have any events with a 'high priority' message skip any other filters and go directly to output plugins
        if (event.data.message == 'high priority') {
            return event.complete()
        }

        // All other events get here
        event.data.superAwesome = 'sure is'

        // Want to rename a field to have a crazy character?
        event.data['@message'] = event.data.message
        delete event.data.message

        // Since this is the last thing in the filter there is no need to return
        event.next()
    })

Filters get an integer name by default. If you want better error and telemetry reporting, give them a name.

Remember, this is all pure Node.js. You can do any crazy exotic thing you want. Just remember that the more you do the
slower each event is processed.

### Outputs

Outputs are exactly what they sound like. The output an event to a place.

Outputs packaged with `streamstash`:

- `ElasticSearch`: Outputs event data to your [ElasticSearch](http://www.elasticsearch.org/overview) cluster.
    Works great with [kibana](http://www.elasticsearch.org/overview/kibana/)
- `StdOut`: Writes event data to standard output

Example usage can be found in the [examples folder](examples)

### Telemetry

If enabled, `streamstash` will output interesting stats to [statsite](https://github.com/armon/statsite),
[statsd](https://github.com/etsy/statsd), or any other service that conforms to the `statsd` line protocol.

General stats

- `events.processing` A gauge of how many events are currently being processed 
- `events.total` A gauge of how many events have been processed since the start of the current process
- `filter.<name>` A timer of how long each event took in each filter. Typically a histogram is created from the
    data so you can see p99, p95, mean, max, etc of the time spent in each filter.

Some plugins may also emit stats.

`RELP`

- `inputs.<PLUGIN NAME>.connection` A gauge of the number of current connections being handled.

Example usage can be found in the [examples folder](examples)

### Docker

Make sure to replace `relp_basic.js` with your own `config.js` in the `Dockerfile` CMD section.
Also, move Dockerfile from the examples folder into home directory or fix file structure in your commands.

Building and running:

```
docker build -t streamstash .
docker run -p 9200:9200 -p 9300:9300 -p 5514:5514 streamstash
```

### TODO

- Need to think about outputs for special events (send interesting thing to slack, email, etc)
- Add some helpers for things like renaming fields in filters?
