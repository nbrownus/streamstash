[![Build Status](https://travis-ci.org/nbrownus/streamstash.png?branch=master)](https://travis-ci.org/nbrownus/streamstash)

### StreamStash

StreamStash is a log aggregating, filtering, redirecting service. A lightweight [Node.js](http://nodejs.org/)
alternative to projects like [logstash](http://logstash.net/), [flume](http://flume.apache.org/),
[fluentd](http://fluentd.org/), etc.

### Inputs

Inputs are things that slurp event data from different places and provides them to StreamStash for filtering
(by filters) and outputting (by outputs).

Inputs packaged with StreamStash

- RELP: Provides an easy and reliable integration with rsyslog. Uses [rsyslogs](http://www.rsyslog.com/) Reliable Event
    Logging Protocol. For more info see the [relp webpage](http://www.rsyslog.com/doc/relp.html)
- StdIn: Takes data received from standard input and creates events for them

### Filters

Filters are javascript functions that allow you to modify event data or control the flow of an event through the system.

The main reason this project exists was to provide users a "real" scripting language to use when working with event
data. If you have ever tried using logstash you may have gotten irritated with trying to do anything more than basic
data manipulation, this is mainly because you were working in almost ruby but not quite.

Every event will contain the following properties in the data object

- source: The input plugin that generated the event
- message: The event message
- timestamp: The time the event occurred or was received by the input plugin

A simple filter example:

    function (event) {
        // Add a gotHere property to the event data
        event.data.gotHere = 'Yay!'

        // Allow the event to progress to the next filter or on to output plugins
        event.next()
    }

A little more advanced:

    function (event) {
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
    }

### Outputs

TODO: Docs!

### TODO

- First class support for codecs?
- Need to think about outputs for special events