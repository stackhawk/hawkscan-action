const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const { getDownloadObject } = require('./cli_utils');

async function setup() {
    try {
        // Get version of tool to be installed
        const version = core.getInput('version');

        // Download the specific version of the tool, e.g. as a tarball/zipball
        const cliVersion = version === 'latest' ? '2.1.0' : version;
        const download = getDownloadObject(cliVersion);
        core.info(download.url)
        core.info(download.binPath)
        const pathToTarball = await tc.downloadTool(download.url);

        core.info(pathToTarball)

        // Extract the tarball/zipball onto host runner
        const extract = download.url.endsWith('.zip') ? tc.extractZip : tc.extractTar;
        const pathToCLI = await extract(pathToTarball);

        core.info(pathToCLI)
        // Expose the tool by adding it to the PATH
        core.addPath(path.join(pathToCLI, download.binPath));

        return pathToCLI;
    } catch (e) {
        core.info(e)
        core.setFailed(e);
    }
}

module.exports ={ setup }

// if (require.main === module) {
//     setup();
// }