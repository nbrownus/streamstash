var StreamStash = require('../../'),
	assertParserResult = require('./util').assertParserResult

describe('merakiParser', function () {
	it('Should parse action=allow Meraki WAP Logs', function() {
		assertParserResult(
			StreamStash.parsers.merakiParser.raw,
			'[0.0 WAP12 flows allow src=0.0.0.0 dst=198.179.1.255 mac=C4:B3:01:CF:70:C7 protocol=128]',
			{
				event: 'meraki_wap',
				action: 'allow',
				src_ip: '0.0.0.0',
				dst_ip: '198.179.1.255',
				mac: 'C4:B3:01:CF:70:C7',
			}
		)
	})

	it('Should parse action=disallow Meraki WAP logs', function() {
		assertParserResult(
			StreamStash.parsers.merakiParser.raw,
			'[0.0 WAP12 flows disallow src=198.179.1.255 dst=198.168.1.172 mac=C4:B3:01:CF:70:C7 protocol=128]',
			{
				event: 'meraki_wap',
				action: 'disallow',
				src_ip: '198.179.1.255',
				dst_ip: '198.168.1.172',
				mac: 'C4:B3:01:CF:70:C7',
			}
		)
	})
	it('Should parse Meraki IDS logs', function() {
		assertParserResult(
			StreamStash.parsers.merakiParser.raw,
			'SFO_5TH_FW1 ids-alerts signature=128:1:1 priority=1 timestamp=1486600623.475848 shost=00:18:0A:78:BE:67 direction=ingress protocol=tcp/ip src=10.10.90.47:62753 dst=54.152.167.64:22 message: (spp_ssh) Challenge-Response Overflow exploit',
			{
				event: 'meraki_ids_alerts',
				sid: '128:1',
				direction: 'ingress',
				src_ip: '10.10.90.47',
				src_port: '62753',
				dst_ip: '54.152.167.64',
				dst_port: '22',
				description: '(spp_ssh) Challenge-Response Overflow exploit',
			}
		)
	})
})