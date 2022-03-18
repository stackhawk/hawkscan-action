const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const { getDownloadObject, getLatestVersion } = require('./cli_utils');
const {gatherInputs} = require('./utilities')

async function setup() {
    try {
        const inputs = gatherInputs();
        // Get version of tool to be installed
        const version = inputs.version;
        const sourceUrl = inputs.sourceURL;

        // Download the specific version of the tool, e.g. as a tarball/zipball
        const cliVersion = version === 'latest' ? await getLatestVersion() : version;
        const download = getDownloadObject(cliVersion, sourceUrl);

        const pathToTarball = await tc.downloadTool(download.url);

        // Extract the zip onto host runner
        const extract = download.url.endsWith('.zip') ? tc.extractZip : tc.extractTar;
        const pathToCLI = await extract(pathToTarball);

        // Expose the tool by adding it to the PATH
        core.addPath(path.join(pathToCLI, download.binPath));

    } catch (e) {
        core.info(e)
        core.setFailed(e);
    }
}

module.exports ={ setup }