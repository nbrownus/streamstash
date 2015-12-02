/**
 * Takes input from rsyslog via the omrelp output plugin and outputs event objects to stdout while in a container
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/relp_container.js
 *
 * Configure your rsyslog instance to talk us and restart
 *
 *      module(load="omrelp")
 *      action(type="omrelp" name="streamstash_relp" target="IP_FOR_CONTAINER_HOST" port="5514")
 *
 * Make sure you have rsyslog-relp installed (ubuntu/debian)
 *
 * Send some log lines to rsyslog
 *
 *      logger "HI THERE"
 */

addInputPlugin('relp', { host: '0.0.0.0', port: 5514, codec: null })
addOutputPlugin('stdout')
