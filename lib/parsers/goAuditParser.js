var constants = require('./goAuditParserConstants')

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
        timestamp: new Date(data.timestamp * 1000),
        sequence: data.sequence
    }

    var groups = gatherTypes(data)

    for (var type in groups) {
        var msgs = groups[type]

        switch (type) {
            case constants.types.config_change:
                //TODO: parseConfigChange(msg)
                break
            case constants.types.syscall:
                parseSyscall(msgs, result, uidMap)
                break
            case constants.types.execve:
                parseExecve(msgs, result)
                break
            case constants.types.path:
                parsePath(msgs, result, uidMap)
                break
            case constants.types.cwd:
                parseCwd(msgs, result)
                break
            default:
                result.error = 'unknown kauditd type ' + type
        }
    }

    buildMessage(result)

    return result
}

module.exports.propertyName = 'go-audit'

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

    result.data.syscall.key = convertValue(result.data.syscall.key, true)

    // Remap some values
    result.data.syscall.id = result.data.syscall.syscall
    delete result.data.syscall.syscall

    result.data.syscall.session_id = result.data.syscall.ses
    delete result.data.syscall.ses

    if (constants.syscalls.hasOwnProperty(result.data.syscall.arch.name)) {
        if (constants.syscalls[result.data.syscall.arch.name].hasOwnProperty(result.data.syscall.id)) {
            result.data.syscall.name = constants.syscalls[result.data.syscall.arch.name][result.data.syscall.id]
        }
    }

    result.data.syscall.command = convertValue(result.data.syscall.comm || '')
    delete result.data.syscall.comm

    result.data.syscall.executable = convertValue(result.data.syscall.exe || '')
    delete result.data.syscall.exe
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

    var argc = parseInt(execve.argc)

    delete execve['argc']

    execve.command = ''

    for (var i = 0; i < argc; i++) {
        var find = 'a' + i
        smashArgs(find, execve)

        if (execve.hasOwnProperty(find) === false) {
            //TODO: this is an error
            continue
        }

        var argv = convertValue(execve[find], true)
        execve.command += argv + ' '
        delete execve[find]
    }

    execve.command = execve.command.trim()
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
        var group = groups[i],
            splitAt = group.indexOf('=')

        if (splitAt < 1) {
            //TODO: error!
            continue
        }

        //TODO: if it already exists???
        ret[group.slice(0, splitAt)] = group.slice(splitAt + 1)
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

    if ((tArch & constants.arch['64bit']) === 0) {
        data.arch.bits = '32'
    } else {
        tArch ^= constants.arch['64bit']
        data.arch.bits = '64'
    }

    if ((tArch & constants.arch.little_endian) === 0) {
        data.arch.endianness = 'big'
    } else {
        tArch ^= constants.arch.little_endian
        data.arch.endianness = 'little'
    }

    if ((tArch & constants.arch.convention_mips64_n32) !== 0) {
        tArch ^= constants.arch.convention_mips64_n32
    }

    if (constants.machines.hasOwnProperty(tArch)) {
        data.arch.name = constants.machines[tArch]
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

var truncateStr = function (str, len) {
    if (str.length > len) {
        return str.substring(0, len - 3) + '...'
    }

    return str
}

var buildMessage = function (result) {
    var data = result.data,
        message = ''

    if (data.hasOwnProperty('syscall')) {
        if (data.syscall.hasOwnProperty('auid') && data.syscall.auid.id != data.syscall.uid.id) {
            message += data.syscall.auid.name + ' as '
        }

        // Who did it?
        if (data.syscall.hasOwnProperty('uid')) {
            message += data.syscall.uid.name + ' '
        }

        // Succeeded or failed?
        if (data.syscall.hasOwnProperty('success')) {
            if (data.syscall.success === 'yes') {
                message += 'succeeded to '
            } else {
                message += 'failed to '
            }
        }

        // To do what?
        var created, deleted, file, path
        message += data.syscall.name + ' '

        if (data.hasOwnProperty('execve') && data.execve.hasOwnProperty('command')) {
            path = data.execve.command.substring(0, data.execve.command.indexOf(' ') || 0)
            message += '`' + truncateStr(data.execve.command, 25) + '` '

        } else if (data.syscall.hasOwnProperty('name')) {


            switch (data.syscall.name) {
                case 'rename':
                    deleted = findPathType(data.paths, 'DELETE')
                    created = findPathType(data.paths, 'CREATE')

                    message += '`' + getPathName(deleted) + '` to `' + getPathName(created) + '` '
                    break
                default:
                    if (created = findPathType(data.paths, 'CREATE')) {
                        path = getPathName(created)
                        message += 'and create '
                    } else if (file = findPathType(data.paths, 'NORMAL')) {
                        path = getPathName(file)
                    } else {
                        path = 'unknown path'
                    }

                    message += '`' + path + '` '
                    break
            }
        }

        if (data.syscall.executable && data.syscall.executable != path) {
            message += 'via `' + data.syscall.executable + '` '
        }
    }

    data.message = message.trim()
}

var getPathName = function (path) {
    return path.name || 'inode: ' + path.inode || 'unknown path'
}

var findPathType = function (paths, type) {
    for (var i in paths) {
        if (paths[i].nametype === type) {
            return paths[i]
        }
    }
}
