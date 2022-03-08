function getDownloadObject(version) {
    const binPath = `/hawk-${ version }`;
    const url = `https://download.stackhawk.com/hawk/cli/hawk-${ version }.zip`;
    return {
        url,
        binPath
    };
}

module.exports = { getDownloadObject }