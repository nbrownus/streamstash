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

var syscalls = {
    'x86_64': {
        '0': 'read',
        '1': 'write',
        '2': 'open',
        '3': 'close',
        '4': 'stat',
        '5': 'fstat',
        '6': 'lstat',
        '7': 'poll',
        '8': 'lseek',
        '9': 'mmap',
        '10': 'mprotect',
        '11': 'munmap',
        '12': 'brk',
        '13': 'rt_sigaction',
        '14': 'rt_sigprocmask',
        '15': 'rt_sigreturn',
        '16': 'ioctl',
        '17': 'pread64',
        '18': 'pwrite64',
        '19': 'readv',
        '20': 'writev',
        '21': 'access',
        '22': 'pipe',
        '23': 'select',
        '24': 'sched_yield',
        '25': 'mremap',
        '26': 'msync',
        '27': 'mincore',
        '28': 'madvise',
        '29': 'shmget',
        '30': 'shmat',
        '31': 'shmctl',
        '32': 'dup',
        '33': 'dup2',
        '34': 'pause',
        '35': 'nanosleep',
        '36': 'getitimer',
        '37': 'alarm',
        '38': 'setitimer',
        '39': 'getpid',
        '40': 'sendfile',
        '41': 'socket',
        '42': 'connect',
        '43': 'accept',
        '44': 'sendto',
        '45': 'recvfrom',
        '46': 'sendmsg',
        '47': 'recvmsg',
        '48': 'shutdown',
        '49': 'bind',
        '50': 'listen',
        '51': 'getsockname',
        '52': 'getpeername',
        '53': 'socketpair',
        '54': 'setsockopt',
        '55': 'getsockopt',
        '56': 'clone',
        '57': 'fork',
        '58': 'vfork',
        '59': 'execve',
        '60': 'exit',
        '61': 'wait4',
        '62': 'kill',
        '63': 'uname',
        '64': 'semget',
        '65': 'semop',
        '66': 'semctl',
        '67': 'shmdt',
        '68': 'msgget',
        '69': 'msgsnd',
        '70': 'msgrcv',
        '71': 'msgctl',
        '72': 'fcntl',
        '73': 'flock',
        '74': 'fsync',
        '75': 'fdatasync',
        '76': 'truncate',
        '77': 'ftruncate',
        '78': 'getdents',
        '79': 'getcwd',
        '80': 'chdir',
        '81': 'fchdir',
        '82': 'rename',
        '83': 'mkdir',
        '84': 'rmdir',
        '85': 'creat',
        '86': 'link',
        '87': 'unlink',
        '88': 'symlink',
        '89': 'readlink',
        '90': 'chmod',
        '91': 'fchmod',
        '92': 'chown',
        '93': 'fchown',
        '94': 'lchown',
        '95': 'umask',
        '96': 'gettimeofday',
        '97': 'getrlimit',
        '98': 'getrusage',
        '99': 'sysinfo',
        '100': 'times',
        '101': 'ptrace',
        '102': 'getuid',
        '103': 'syslog',
        '104': 'getgid',
        '105': 'setuid',
        '106': 'setgid',
        '107': 'geteuid',
        '108': 'getegid',
        '109': 'setpgid',
        '110': 'getppid',
        '111': 'getpgrp',
        '112': 'setsid',
        '113': 'setreuid',
        '114': 'setregid',
        '115': 'getgroups',
        '116': 'setgroups',
        '117': 'setresuid',
        '118': 'getresuid',
        '119': 'setresgid',
        '120': 'getresgid',
        '121': 'getpgid',
        '122': 'setfsuid',
        '123': 'setfsgid',
        '124': 'getsid',
        '125': 'capget',
        '126': 'capset',
        '127': 'rt_sigpending',
        '128': 'rt_sigtimedwait',
        '129': 'rt_sigqueueinfo',
        '130': 'rt_sigsuspend',
        '131': 'sigaltstack',
        '132': 'utime',
        '133': 'mknod',
        '134': 'uselib',
        '135': 'personality',
        '136': 'ustat',
        '137': 'statfs',
        '138': 'fstatfs',
        '139': 'sysfs',
        '140': 'getpriority',
        '141': 'setpriority',
        '142': 'sched_setparam',
        '143': 'sched_getparam',
        '144': 'sched_setscheduler',
        '145': 'sched_getscheduler',
        '146': 'sched_get_priority_max',
        '147': 'sched_get_priority_min',
        '148': 'sched_rr_get_interval',
        '149': 'mlock',
        '150': 'munlock',
        '151': 'mlockall',
        '152': 'munlockall',
        '153': 'vhangup',
        '154': 'modify_ldt',
        '155': 'pivot_root',
        '156': '_sysctl',
        '157': 'prctl',
        '158': 'arch_prctl',
        '159': 'adjtimex',
        '160': 'setrlimit',
        '161': 'chroot',
        '162': 'sync',
        '163': 'acct',
        '164': 'settimeofday',
        '165': 'mount',
        '166': 'umount2',
        '167': 'swapon',
        '168': 'swapoff',
        '169': 'reboot',
        '170': 'sethostname',
        '171': 'setdomainname',
        '172': 'iopl',
        '173': 'ioperm',
        '174': 'create_module	',
        '175': 'init_module',
        '176': 'delete_module',
        '177': 'get_kernel_syms	',
        '178': 'query_module	',
        '179': 'quotactl',
        '180': 'nfsservctl	',
        '181': 'getpmsg	',
        '182': 'putpmsg	',
        '183': 'afs_syscall	',
        '184': 'tuxcall	',
        '185': 'security	',
        '186': 'gettid',
        '187': 'readahead',
        '188': 'setxattr',
        '189': 'lsetxattr',
        '190': 'fsetxattr',
        '191': 'getxattr',
        '192': 'lgetxattr',
        '193': 'fgetxattr',
        '194': 'listxattr',
        '195': 'llistxattr',
        '196': 'flistxattr',
        '197': 'removexattr',
        '198': 'lremovexattr',
        '199': 'fremovexattr',
        '200': 'tkill',
        '201': 'time',
        '202': 'futex',
        '203': 'sched_setaffinity',
        '204': 'sched_getaffinity',
        '205': 'set_thread_area	',
        '206': 'io_setup',
        '207': 'io_destroy',
        '208': 'io_getevents',
        '209': 'io_submit',
        '210': 'io_cancel',
        '211': 'get_thread_area	',
        '212': 'lookup_dcookie',
        '213': 'epoll_create',
        '214': 'epoll_ctl_old	',
        '215': 'epoll_wait_old	',
        '216': 'remap_file_pages',
        '217': 'getdents64',
        '218': 'set_tid_address',
        '219': 'restart_syscall',
        '220': 'semtimedop',
        '221': 'fadvise64',
        '222': 'timer_create',
        '223': 'timer_settime',
        '224': 'timer_gettime',
        '225': 'timer_getoverrun',
        '226': 'timer_delete',
        '227': 'clock_settime',
        '228': 'clock_gettime',
        '229': 'clock_getres',
        '230': 'clock_nanosleep',
        '231': 'exit_group',
        '232': 'epoll_wait',
        '233': 'epoll_ctl',
        '234': 'tgkill',
        '235': 'utimes',
        '236': 'vserver	',
        '237': 'mbind',
        '238': 'set_mempolicy',
        '239': 'get_mempolicy',
        '240': 'mq_open',
        '241': 'mq_unlink',
        '242': 'mq_timedsend',
        '243': 'mq_timedreceive',
        '244': 'mq_notify',
        '245': 'mq_getsetattr',
        '246': 'kexec_load',
        '247': 'waitid',
        '248': 'add_key',
        '249': 'request_key',
        '250': 'keyctl',
        '251': 'ioprio_set',
        '252': 'ioprio_get',
        '253': 'inotify_init',
        '254': 'inotify_add_watch',
        '255': 'inotify_rm_watch',
        '256': 'migrate_pages',
        '257': 'openat',
        '258': 'mkdirat',
        '259': 'mknodat',
        '260': 'fchownat',
        '261': 'futimesat',
        '262': 'newfstatat',
        '263': 'unlinkat',
        '264': 'renameat',
        '265': 'linkat',
        '266': 'symlinkat',
        '267': 'readlinkat',
        '268': 'fchmodat',
        '269': 'faccessat',
        '270': 'pselect6',
        '271': 'ppoll',
        '272': 'unshare',
        '273': 'set_robust_list',
        '274': 'get_robust_list',
        '275': 'splice',
        '276': 'tee',
        '277': 'sync_file_range',
        '278': 'vmsplice',
        '279': 'move_pages',
        '280': 'utimensat',
        '281': 'epoll_pwait',
        '282': 'signalfd',
        '283': 'timerfd_create',
        '284': 'eventfd',
        '285': 'fallocate',
        '286': 'timerfd_settime',
        '287': 'timerfd_gettime',
        '288': 'accept4',
        '289': 'signalfd4',
        '290': 'eventfd2',
        '291': 'epoll_create1',
        '292': 'dup3',
        '293': 'pipe2',
        '294': 'inotify_init1',
        '295': 'preadv',
        '296': 'pwritev',
        '297': 'rt_tgsigqueueinfo',
        '298': 'perf_event_open',
        '299': 'recvmmsg',
        '300': 'fanotify_init',
        '301': 'fanotify_mark',
        '302': 'prlimit64',
        '303': 'name_to_handle_at',
        '304': 'open_by_handle_at',
        '305': 'clock_adjtime',
        '306': 'syncfs',
        '307': 'sendmmsg',
        '308': 'setns',
        '309': 'getcpu',
        '310': 'process_vm_readv',
        '311': 'process_vm_writev',
        '312': 'kcmp',
        '313': 'finit_module'
    }
}

var addressFamilies = {
    '0': 'unspecified',
    '1': 'local',
    '2': 'inet',
    '3': 'ax25',
    '4': 'ipx',
    '5': 'appletalk',
    '6': 'netrom',
    '7': 'bridge',
    '8': 'atmpvc',
    '9': 'x25',
    '10': 'inet6',
    '11': 'rose',
    '12': 'decnet',
    '13': 'netbeui',
    '14': 'security',
    '15': 'key',
    '16': 'netlink',
    '17': 'packet',
    '18': 'ash',
    '19': 'econet',
    '20': 'atmsvc',
    '21': 'rds',
    '22': 'sna',
    '23': 'irda',
    '24': 'pppox',
    '25': 'wanpipe',
    '26': 'llc',
    '27': 'ib',
    '28': 'mpls',
    '29': 'can',
    '30': 'tipc',
    '31': 'bluetooth',
    '32': 'iucv',
    '33': 'rxrpc',
    '34': 'isdn',
    '35': 'phonet',
    '36': 'ieee802154',
    '37': 'caif',
    '38': 'alg',
    '39': 'nfc',
    '40': 'vsock',
    '41': 'kcm',
    '42': 'qipcrtr',
}

module.exports = {
    types: types,
    arch: arch,
    machines: machines,
    syscalls: syscalls,
    addressFamilies: addressFamilies
}
