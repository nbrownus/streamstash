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
})