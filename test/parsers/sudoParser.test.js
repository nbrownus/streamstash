var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult

describe.only('sshdParser', function () {

    it('Should parse simple command', function () {
        assertParserResult(
            StreamStash.parsers.sudoParser.raw,
            '    nate : TTY=pts/0 ; PWD=/home/nate/hi there/oops; ; USER=root ; COMMAND=/bin/ls ../oops; -l',
            {
                as_user: 'root',
                command: '/bin/ls ../oops; -l',
                event: 'command',
                pwd: '/home/nate/hi there/oops;',
                tty: 'pts/0',
                user: 'nate'
            }
        )
    })

})
