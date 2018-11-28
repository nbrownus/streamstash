var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult

describe('sudoParser', function () {

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

    it('Should parse a sudo error', function () {
        assertParserResult(
            StreamStash.parsers.sudoParser.raw,
            '    someone : command not allowed ; TTY=pts/40 ; PWD=/home/somewhere ; USER=root ; COMMAND=/bin/something',
            {
                as_user: 'root',
                command: '/bin/something',
                error: 'command not allowed',
                event: 'error',
                pwd: '/home/somewhere',
                tty: 'pts/40',
                user: 'someone'
            }
        )
    })

})
