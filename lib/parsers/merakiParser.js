
var regexes = [
	{
	name: 'meraki_wap',
	regex: / \S+\d+ flows (disallow|allow) src=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) dst=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) mac=(([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})) protocol=\d+/,
	parts: ['action', 'src_ip', 'dst_ip', 'mac']
	},
	{
	name: 'meraki_ids_alerts',
	regex: /ids-alerts signature=(\d+:\d+):\d+ priority=\d+ timestamp=\d+\.\d+ shost=\S+ direction=(ingress|egress) protocol=\S+ src=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+) dst=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+) message:(.*)/,
	parts: ['sid', 'direction', 'src_ip', 'src_port', 'dst_ip', 'dst_port', 'description']	
	}
	]

/**
 * Parses log lines from Meraki
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {

var parts = [],
	matched,
	data = {}

regexes.some(function (group) {
  parts = group.regex.exec(message)
	if (parts) {
		matched = group
		return true
	}
})

if (!matched) {
	return { data: void 0, error: 'No matches' }
}

data.event = matched.name
matched.parts.forEach(function (name, index) {
	data[name] = parts[index + 1].trim()
})

return { data: data, error: void 0 }
}

module.exports.propertyName = 'merakiParser'