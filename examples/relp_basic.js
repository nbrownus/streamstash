/**
 * Takes input from rsyslog via the omrelp output plugin and outputs event objects to stdout
 *
 * Try it by running
 *
 *      ./bin/streamstash examples/relp_basic.js
 *
 * Configure your rsyslog instance to talk us and restart
 *
 *      module(load="omrelp")
 *      action(type="omrelp" name="streamstash_relp" target="localhost" port="5514")
 *
 * Make sure you have rsyslog-relp installed (ubuntu/debian)
 *
 * Send some log lines to rsyslog
 *
 *      logger "HI THERE"
 */

addInputPlugin('relp', { host: 'localhost', port: 5514 })
addOutputPlugin('stdout')
