const os = require('os');
const path = require('path');

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch(arch) {
    const mappings = {
        x32: '386',
        x64: 'amd64'
    };
    return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS(os) {
    const mappings = {
        darwin: 'macOS',
        win32: 'windows'
    };
    return mappings[os] || os;
}

function getDownloadObject(version) {
    const platform = os.platform();
    const filename = `gh_${ version }_${ mapOS(platform) }_${ mapArch(os.arch()) }`;
    // const extension = platform === 'win32' ? 'zip' : 'tar.gz';
    const binPath = platform === 'win32' ? 'bin' : path.join(filename, 'bin');
    const url = `https://download.stackhawk.com/hawk/cli/hawk-${ version }.zip`;
    return {
        url,
        binPath
    };
}

module.exports = { getDownloadObject }