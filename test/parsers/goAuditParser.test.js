var StreamStash = require('../../'),
    assertParserResult = require('./util').assertParserResult

describe('goAuditParser', function () {

    it.skip('Should parse a single event', function () {
        var thing = {
            "sequence":1226433,
            "timestamp":"1459447820.317",
            "messages":[{"type":1305,"data":"audit_pid=14842 old=14842 auid=1000 ses=37 res=1"}],
            "uid_map":{"1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(thing),
            {}
        )
    })

    it('Should parse a syscall event', function () {
        var data = {
            "sequence":1226679,
            "timestamp":"1459449216.329",
            "messages":[
                {"type":1300,"data":"arch=c000003e syscall=59 success=yes exit=0 a0=7f7242278f28 a1=7f7242278e60 a2=7f7242278e78 a3=7f7241707a10 items=2 ppid=15125 pid=15126 auid=1000 uid=1000 gid=1000 euid=1000 suid=1000 fsuid=1000 egid=1000 sgid=1000 fsgid=1000 tty=pts0 ses=37 comm=\"curl\" exe=\"/usr/bin/curl\" key=(null)"},
            ],
            "uid_map":{"0":"root","1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {
                syscall: {
                    arch: { bits: '64', endianness: 'little', name: 'x86_64' },
                    id: '59',
                    name: 'execve',
                    success: 'yes',
                    exit: '0',
                    a0: '7f7242278f28',
                    a1: '7f7242278e60',
                    a2: '7f7242278e78',
                    a3: '7f7241707a10',
                    items: '2',
                    ppid: '15125',
                    pid: '15126',
                    auid: { name: 'ubuntu', id: '1000' },
                    uid: { name: 'ubuntu', id: '1000' },
                    gid: '1000',
                    euid: { name: 'ubuntu', id: '1000' },
                    suid: { name: 'ubuntu', id: '1000' },
                    fsuid: { name: 'ubuntu', id: '1000' },
                    egid: '1000',
                    sgid: '1000',
                    fsgid: '1000',
                    tty: 'pts0',
                    session_id: '37',
                    command: 'curl',
                    executable: '/usr/bin/curl',
                    key: ''
                },
                sequence: 1226679,
                unknown: [],
                timestamp: new Date('1459449216.329' * 1000),
                message: "ubuntu succeeded to execve `unknown path` via `/usr/bin/curl`"
            }
        )
    })

    it('Should parse a complex execve event', function () {
        var data = {
            "sequence":1226679,
            "timestamp":'1459449216.329',
            "messages":[
                {"type":1309,"data":"argc=2 a0=\"curl\""},
                {"type":1309,"data":" a1_len=52082 a1[0]=68"},
                {"type":1309,"data":" a1[1]=68"},
                {"type":1309,"data":" a1[2]=68"},
                {"type":1309,"data":" a1[3]=68"},
                {"type":1309,"data":" a1[4]=68"},
                {"type":1309,"data":" a1[5]=68"},
                {"type":1309,"data":" a1[6]=68"},
            ],
            "uid_map":{"0":"root","1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {
                execve: {
                    command: 'curl hhhhhhh'
                },
                sequence: 1226679,
                unknown: [],
                timestamp: new Date('1459449216.329' * 1000),
                message: ""
            }
        )
    })

    it('Should parse paths', function () {
        var data = {
            "sequence":1226679,
            "timestamp":'1459449216.329',
            "messages":[
                {"type":1302,"data":"item=0 name=\"/usr/bin/curl\" inode=638 dev=ca:01 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL"},
                {"type":1302,"data":"item=1 name=\"/lib64/ld-linux-x86-64.so.2\" inode=396037 dev=ca:01 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL"}
            ],
            "uid_map":{"0":"root","1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {
                paths: [
                    {
                        dev: 'ca:01',
                        inode: '638',
                        mode: '0100755',
                        name: '/usr/bin/curl',
                        nametype: 'NORMAL',
                        ogid: '0',
                        ouid: { id: '0', name: 'root' },
                        rdev: '00:00'
                    },
                    {
                        dev: 'ca:01',
                        inode: '396037',
                        mode: '0100755',
                        name: '/lib64/ld-linux-x86-64.so.2',
                        nametype: 'NORMAL',
                        ogid: '0',
                        ouid: { id: '0', name: 'root' },
                        rdev: '00:00'
                    }
                ],
                sequence: 1226679,
                unknown: [],
                timestamp: new Date('1459449216.329' * 1000),
                message: ""
            }
        )
    })

    it('Should parse cwd', function () {
        var data = {
            "sequence":1226679,
            "timestamp":'1459449216.329',
            "messages":[
                {"type":1307,"data":" cwd=2F686F6D652F7562756E74752F74657374207769746820737061636573"}
            ],
            "uid_map":{"0":"root","1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {
                cwd: '/home/ubuntu/test with spaces',
                sequence: 1226679,
                unknown: [],
                timestamp: new Date('1459449216.329' * 1000),
                message: ""
            }
        )
    })

    it('Normal execve test', function () {
        var data = {
            "sequence":1226679,
            "timestamp":'1459449216.329',
            "messages":[
                {"type":1307,"data":" cwd=2F686F6D652F7562756E74752F74657374207769746820737061636573"},
                {"type":1302,"data":"item=0 name=\"/usr/bin/curl\" inode=638 dev=ca:01 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL"},
                {"type":1302,"data":"item=1 name=\"/lib64/ld-linux-x86-64.so.2\" inode=396037 dev=ca:01 mode=0100755 ouid=0 ogid=0 rdev=00:00 nametype=NORMAL"},
                {"type":1309,"data":"argc=2 a0=\"curl\""},
                {"type":1309,"data":" a1_len=52082 a1[0]=68"},
                {"type":1309,"data":" a1[1]=68"},
                {"type":1309,"data":" a1[2]=68"},
                {"type":1309,"data":" a1[3]=68"},
                {"type":1309,"data":" a1[4]=68"},
                {"type":1309,"data":" a1[5]=68"},
                {"type":1309,"data":" a1[6]=68"},
                {"type":1300,"data":"arch=c000003e syscall=59 success=yes exit=0 a0=7f7242278f28 a1=7f7242278e60 a2=7f7242278e78 a3=7f7241707a10 items=2 ppid=15125 pid=15126 auid=1000 uid=1000 gid=1000 euid=1000 suid=1000 fsuid=1000 egid=1000 sgid=1000 fsgid=1000 tty=pts0 ses=37 comm=\"curl\" exe=\"/usr/bin/curl\" key=(null)"}
            ],
            "uid_map":{"0":"root","1000":"ubuntu"}
        }

        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {
                "timestamp":new Date('1459449216.329' * 1000),
                "sequence":1226679,
                "unknown": [],
                "syscall":{
                    "arch":{"bits":"64","endianness":"little","name":"x86_64"},
                    "success":"yes",
                    "exit":"0",
                    "a0":"7f7242278f28",
                    "a1":"7f7242278e60",
                    "a2":"7f7242278e78",
                    "a3":"7f7241707a10",
                    "items":"2",
                    "ppid":"15125",
                    "pid":"15126",
                    "auid":{"name":"ubuntu","id":"1000"},
                    "uid":{"name":"ubuntu","id":"1000"},
                    "gid":"1000",
                    "euid":{"name":"ubuntu","id":"1000"},
                    "suid":{"name":"ubuntu","id":"1000"},
                    "fsuid":{"name":"ubuntu","id":"1000"},
                    "egid":"1000",
                    "sgid":"1000",
                    "fsgid":"1000",
                    "tty":"pts0",
                    "key":"",
                    "id":"59",
                    "session_id":"37",
                    "name":"execve",
                    "command":"curl",
                    "executable":"/usr/bin/curl"
                },
                "paths":[
                    {"name":"/usr/bin/curl","inode":"638","dev":"ca:01","mode":"0100755","ouid":{"name":"root","id":"0"},"ogid":"0","rdev":"00:00","nametype":"NORMAL"},
                    {"name":"/lib64/ld-linux-x86-64.so.2","inode":"396037","dev":"ca:01","mode":"0100755","ouid":{"name":"root","id":"0"},"ogid":"0","rdev":"00:00","nametype":"NORMAL"}
                ],
                "cwd":"/home/ubuntu/test with spaces",
                "execve":{
                    "command":"curl hhhhhhh"
                },
                "message":"ubuntu succeeded to execve `curl hhhhhhh` via `/usr/bin/curl`"
            }
        )
    })

    it('Should handle = in values properly', function () {
        var data = {"sequence":10453717,"timestamp":"1462897538.564","messages":[{"type":1309,"data":"argc=1 a0=\"stuff=things\""}]},
            result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))

        result.data.execve.command.should.eql("stuff=things")

        data = {"sequence":10453717,"timestamp":"1462897538.564","messages":[{"type":1309,"data":"argc=1 a0=\"stuff=\""}]}
        result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))

        result.data.execve.command.should.eql("stuff=")
    })

    it('Should get dnstap info', function () {
     var data = {                                  
               "sequence": 4734103,             
               "timestamp": "1541004016.778",   
               "messages": [                    
                           {"type": 1306, "data": "saddr=02000050ACD91D8E0000000000000000"},                             
                         ],                               
               "dnstap": {                      
                           "172.217.29.142": "google.com" 
                         }                                
     }    
   
        assertParserResult(
            StreamStash.parsers.goAuditParser.raw,
            JSON.stringify(data),
            {"timestamp":new Date('1541004016.778' * 1000),"sequence":4734103,"unknown":[],"socket_address":{"family":"inet","port":80,"ip":"172.217.29.142","unknown":"0000000000000000"},"dnstap":"google.com","message":""}
        )
    })

    it('Should parse a sockaddr', function () {
        var data = {"sequence":10453717,"timestamp":"1462897538.564","messages":[{"type":1306,"data":"saddr=0200270F000000000000000000000000"}]},
            result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))
        result.data.socket_address.should.eql({"family":"inet","port":9999,"ip":"0.0.0.0","unknown":"0000000000000000"})

        data = {"sequence":10453717,"timestamp":"1462897538.564","messages":[{"type":1306,"data":"saddr=0A00270F0000000000000000000000000000000000000001000000000000"}]}
        result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))
        result.data.socket_address.should.eql({"family":"inet6","port":9999,"flow_info":"00000000","ip":"0000:0000:0000:0000:0000:0000:0000:0001","scope_id":"00000000","unknown":"0000"})

        data = {"sequence":10453717,"timestamp":"1462897538.564","messages":[{"type":1306,"data":"saddr=01002F686F6D652F6E6174652F736F636B65740010"}]}
        result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))
        result.data.socket_address.should.eql({"family":"local","path":"/home/nate/socket","unknown":"0010"})
    })

    it('should parse a proctitle', function () {
        var data = {"sequence":1188,"timestamp":"1473790050.668","messages":[{"type":1327,"data":"proctitle=6E63002D6C0039393939"}]},
            result = StreamStash.parsers.goAuditParser.raw(JSON.stringify(data))

        result.data.proctitle.should.eql('nc -l 9999')
    })

})
