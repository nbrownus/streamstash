var types = {
    syscall        : '1300', /* Syscall event */
    path           : '1302', /* Filename path information */
    ipc            : '1303', /* IPC record */
    socketcall     : '1304', /* sys_socketcall arguments */
    config_change  : '1305', /* Audit system configuration change */
    sockaddr       : '1306', /* sockaddr copied as syscall arg */
    cwd            : '1307', /* Current working directory */
    execve         : '1309', /* execve arguments */
    ipc_set_perm   : '1311', /* IPC new permissions record type */
    mq_open        : '1312', /* POSIX MQ open record type */
    mq_sendrecv    : '1313', /* POSIX MQ send/receive record type */
    mq_notify      : '1314', /* POSIX MQ notify record type */
    mq_getsetattr  : '1315', /* POSIX MQ get/set attribute record type */
    kernel_other   : '1316', /* For use by 3rd party modules */
    fd_pair        : '1317', /* audit record for pipe/socketpair */
    obj_pid        : '1318', /* ptrace target */
    tty            : '1319', /* Input on an administrative TTY */
    eoe            : '1320', /* End of multi-record event */
    bprm_fcaps     : '1321', /* Information about fcaps increasing perms */
    capset         : '1322', /* Record showing argument to sys_capset */
    mmap           : '1323', /* Record showing descriptor and flags in mmap */
    netfilter_pkt  : '1324', /* Packets traversing netfilter chains */
    netfilter_cfg  : '1325', /* Netfilter chain modifications */
    seccomp        : '1326', /* Secure Computing event */
    proctitle      : '1327', /* Proctitle emit event */
    feature_change : '1328', /* audit log listing feature changes */
    replace        : '1329'  /* Replace auditd if this packet unanswerd */
}

var arch = {
    '64bit': 0x80000000,
    little_endian: 0x40000000,
    convention_mips64_n32: 0x20000000
}

var machines = {
    '0': 'none',  /* Unknown machine. */
    '1': 'm32',  /* AT&T WE32100. */
    '2': 'sparc',  /* Sun SPARC. */
    '3': '386',  /* Intel i386. */
    '4': '68k',  /* Motorola 68000. */
    '5': '88k',  /* Motorola 88000. */
    '7': '860',  /* Intel i860. */
    '8': 'mips',  /* MIPS R3000 Big-Endian only. */
    '9': 's370',  /* IBM System/370. */
    '10': 'mips_rs3_le',  /* MIPS R3000 Little-Endian. */
    '15': 'parisc',  /* HP PA-RISC. */
    '17': 'vpp500',  /* Fujitsu VPP500. */
    '18': 'sparc32plus',  /* SPARC v8plus. */
    '19': '960',  /* Intel 80960. */
    '20': 'ppc',  /* PowerPC 32-bit. */
    '21': 'ppc64',  /* PowerPC 64-bit. */
    '22': 's390',  /* IBM System/390. */
    '36': 'v800',  /* NEC V800. */
    '37': 'fr20',  /* Fujitsu FR20. */
    '38': 'rh32',  /* TRW RH-32. */
    '39': 'rce',  /* Motorola RCE. */
    '40': 'arm',  /* ARM. */
    '42': 'sh',  /* Hitachi SH. */
    '43': 'sparcv9',  /* SPARC v9 64-bit. */
    '44': 'tricore',  /* Siemens TriCore embedded processor. */
    '45': 'arc',  /* Argonaut RISC Core. */
    '46': 'h8_300',  /* Hitachi H8/300. */
    '47': 'h8_300h',  /* Hitachi H8/300H. */
    '48': 'h8s',  /* Hitachi H8S. */
    '49': 'h8_500',  /* Hitachi H8/500. */
    '50': 'ia_64',  /* Intel IA-64 Processor. */
    '51': 'mips_x',  /* Stanford MIPS-X. */
    '52': 'coldfire',  /* Motorola ColdFire. */
    '53': '68hc12',  /* Motorola M68HC12. */
    '54': 'mma',  /* Fujitsu MMA. */
    '55': 'pcp',  /* Siemens PCP. */
    '56': 'ncpu',  /* Sony nCPU. */
    '57': 'ndr1',  /* Denso NDR1 microprocessor. */
    '58': 'starcore',  /* Motorola Star*Core processor. */
    '59': 'me16',  /* Toyota ME16 processor. */
    '60': 'st100',  /* STMicroelectronics ST100 processor. */
    '61': 'tinyj',  /* Advanced Logic Corp. TinyJ processor. */
    '62': 'x86_64',  /* Advanced Micro Devices x86-64 */
    '183': 'aarch64'  /* ARM 64-bit Architecture (AArch64) */
}
/**
 * Parses go-audit log lines
 * Assumes the message has NOT been json decoded already
 *
 * @param {String} message Message to try and parse
 *
 * @returns {parserResult}
 */
module.exports = function (message) {
    var result = { data: void 0, error: void 0},
        data = {}

    try {
        data = JSON.parse(message)
    } catch (error) {
        result.error = error.toString()
        return result
    }

    if (data.hasOwnProperty('messages') === false) {
        result.error = 'No messages property'
        return result
    }

    var uidMap = data['uid_map'] || {}

    result.data = {
        timestamp: data.timestamp,
        sequence: data.sequence
    }

    var groups = gatherTypes(data)

    for (var type in groups) {
        var msgs = groups[type]

        switch (type) {
            case types.config_change:
                //TODO: parseConfigChange(msg)
                break
            case types.syscall:
                parseSyscall(msgs, result, uidMap)
                break
            case types.execve:
                parseExecve(msgs, result)
                break
            case types.path:
                parsePath(msgs, result, uidMap)
                break
            case types.cwd:
                parseCwd(msgs, result)
                break
            default:
                result.error = 'unknown kauditd type ' + type
        }
    }

    return result
}

var parseConfigChange = function (msg) {
    //audit_pid=14842 old=14842 auid=1000 ses=37 res=1
}

/**
 * Parses types.syscall messages
 *
 * @param {String[]} msgs List of messages to parse
 * @param {Object} result The final result object to modify
 * @param {Object} uidMap An object of uid mapping to use for mapping uids
 */
var parseSyscall = function (msgs, result, uidMap) {
    var msg = msgs.join(' ')
    //TODO: map this back to the name
    // syscall=59

    //TODO: It doesn't seem like we will get much info from these though
    // a0=56446febeb60
    // a1=56446febeaf8
    // a2=56446febeb48
    // a3=0

    // items=2 TODO: this appears to be a reference to how many 1302 msgs to expect later

    //TODO: convert to name and id
    // gid=0
    // egid=0
    // sgid=0
    // fsgid=0

    //TODO: convert to actual null?
    // key=(null)

    //TODO: check if syscall is already defined because that would be an error
    //TODO: don't split on space in a quote
    result.data.syscall = splitFields(msg)

    mapArch(result.data.syscall)
    mapUid('uid', result.data.syscall, uidMap)
    mapUid('auid', result.data.syscall, uidMap)
    mapUid('euid', result.data.syscall, uidMap)
    mapUid('fsuid', result.data.syscall, uidMap)
    mapUid('suid', result.data.syscall, uidMap)

    // Remap some values
    result.data.syscall.session_id = result.data.syscall.ses
    delete result.data.syscall.ses

    result.data.syscall.comm = convertValue(result.data.syscall.comm || '')
    result.data.syscall.exe = convertValue(result.data.syscall.exe || '')
}

/**
 * Parses types.execve messages
 *
 * @param {String[]} msgs List of messages to parse
 * @param {Object} result The final result object to modify
 */
var parseExecve = function (msgs, result) {
    var msg = msgs.join(' '),
        execve = splitFields(msg)

    if (execve.hasOwnProperty('argc') === false) {
        //TODO: error!
        return
    }

    var argc = parseInt(execve.argc),
        command = ""

    delete execve['argc']

    execve.argv = []

    for (var i = 0; i < argc; i++) {
        var find = 'a' + i
        smashArgs(find, execve)

        if (execve.hasOwnProperty(find) === false) {
            //TODO: this is an error
            continue
        }

        var argv = convertValue(execve[find], true)
        command += ' ' + argv
        execve.argv.push(argv)
        delete execve[find]
    }

    execve['command'] = command.trim()
    result.data.execve = execve
}

/**
 * Parses types.path messages
 *
 * @param {String[]} msgs List of messages to parse
 * @param {Object} result The final result object to modify
 * @param {Object} uidMap An object of uid mapping to use for mapping uids
 */
var parsePath = function (msgs, result, uidMap) {
    //TODO: we should know how many of these to parse from result.syscall
    var paths = []

    for (var i in msgs) {
        var entries = splitFields(msgs[i])
        delete msgs[i]

        mapUid('ouid', entries, uidMap)
        //TODO: ogid is not mapped
        //TODO: parse mode?

        entries.name = convertValue(entries.name || '', true)

        //TODO: check for .item and that parseint works
        var index = parseInt(entries.item)
        delete entries['item']
        paths[index] = entries
    }

    result.data.paths = paths
}

/**
 * Parses types.cwd messages
 *
 * @param {String[]} msgs List of messages to parse
 * @param {Object} result The final result object to modify
 */
var parseCwd = function (msgs, result) {
    var msg = msgs.join(' '),
        data = splitFields(msg)

    result.data.cwd = convertValue(data.cwd || '', true)
}

/**
 * Gathers all aN[N] object into a single string.
 * kauditd will break apart really large arguments into a sub array.
 *
 * @param {String} arg The arg name to look for, like `a1`
 * @param {Object} data The data object containing the args, modified in place
 */
var smashArgs = function (arg, data) {
    if (data.hasOwnProperty(arg + '_len') === false) {
        return
    }

    var argLen = parseInt(data[arg + '_len']),
        val = ''

    delete data[arg + '_len']

    //TODO: don't bother if arglen doesnt parse
    for (var i = 0; i >= 0; i++) {
        var subArg = arg + '[' + i + ']'
        if (data.hasOwnProperty(subArg) === false) {
            //TODO: error!
            break
        }

        val += data[subArg]
        delete data[subArg]
    }

    //TODO: check length
    data[arg] = val
}

/**
 * Turns a flat array into an object keyed by msg.type
 * Each key will be an array of msg.data
 *
 * @param {Object} data
 *
 * @returns {{string:string[]}}
 */
var gatherTypes = function (data) {
    var groups = {},
        str = ''

    for (var i in data.messages) {
        var msg = data.messages[i]

        if (msg.hasOwnProperty('type') === false) {
            result.error = 'A message was missing the type property'
            return result
        }

        if (groups.hasOwnProperty(msg.type) === false) {
            groups[msg.type] = []
        }

        groups[msg.type].push(msg.data)
        delete data.messages[i]
    }

    return groups
}

/**
 * Converts a value to what it should be, for the most part.
 * Currently only strips quotes and optionally converts hex strings to actual strings
 *
 * @param {String} str The string to convert
 * @param {boolean} parseHex If true, will treat `str` as a hex string as a last resort.
 *
 * @returns {*} The converted string representation of `str`
 */
var convertValue = function (str, parseHex) {
    if (str[0] === '"') {
        return str.slice(1,-1)

    } else if (parseHex) {
        var newStr = '';

        for (var i = 0; i < str.length; i += 2) {
            var v = parseInt(str.substr(i, 2), 16)
            if (v) {
                newStr += String.fromCharCode(v)
            }
        }

        return newStr
    }

    return str
}

/**
 * Splits a string containing many `key=value` pairs into an object of key: value pairs
 *
 * @param {String} str The string to break apart
 *
 * @returns {Object} An object of key: value pairs
 */
var splitFields = function (str) {
    var groups = str.split(" "),
        ret = {}

    for (var i in groups) {
        var parts = groups[i].split('=', 2)
        if (parts.length != 2) {
            //TODO: error!
            continue
        }

        //TODO: if it already exists???
        ret[parts[0]] = parts[1]
    }

    return ret
}

/**
 * Converts the `arch` property, which should be a hex string, to an object.
 * Modifies the data object in place
 *
 * @param {Object} data The object to map out the `arch` property
 */
var mapArch = function(data) {
    if (data.hasOwnProperty('arch') === false) {
        return
    }

    var tArch = parseInt(data.arch, 16)

    data.arch = {
        bits: 'unknown',
        endianness: 'unknown',
        name: 'unknown'
    }

    if ((tArch & arch['64bit']) === 0) {
        data.arch.bits = '32'
    } else {
        tArch ^= arch['64bit']
        data.arch.bits = '64'
    }

    if ((tArch & arch.little_endian) === 0) {
        result.arch.endianness = 'big'
    } else {
        tArch ^= arch.little_endian
        data.arch.endianness = 'little'
    }

    if ((tArch & arch.convention_mips64_n32) !== 0) {
        tArch ^= arch.convention_mips64_n32
    }

    if (machines.hasOwnProperty(tArch)) {
        data.arch.name = machines[tArch]
    } else {
        //TODO:
        console.log('SOMETHING IS WRONG')
    }
}

/**
 * Maps a given uid to a name.
 * Modifies the data object in place
 *
 * @param {String} findUid The name of the uid in data
 * @param {Object} data The object possibly containing `findUid`
 * @param {Object} uidMap Keys are uids, values are usernames.
 */
var mapUid = function (findUid, data, uidMap) {
    if (data.hasOwnProperty(findUid)) {
        uid = data[findUid]
        data[findUid] = {
            name: uidMap.hasOwnProperty(uid) ? uidMap[uid] : 'UNKNOWN_USER',
            id: uid
        }
    }
}

