const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const fs = require('fs');
const os = require('os')
const { getDownloadObject, getLatestVersion } = require('./cli_utils');
const {gatherInputs} = require('./utilities')

/*
Returns the path of the hawkscan executable to run for the respective OS
*/
async function setup() {
  try {
    const inputs = gatherInputs();
    // Get version of tool to be installed
    const version = inputs.version;
    const sourceUrl = inputs.sourceURL;

    // Download the specific version of the tool, e.g. as a tarball/zipball
    const cliVersion =
      version === "latest" ? await getLatestVersion() : version;
    const download = getDownloadObject(cliVersion, sourceUrl);
    const pathToTarball = await tc.downloadTool(download.url);
    
    // Extract the zip onto host runner
    const extract = download.url.endsWith(".zip")
      ? tc.extractZip
      : tc.extractTar;
    const pathToCLI = await extract(pathToTarball);
    const hawkScanPath = path.join(pathToCLI, download.binPath)
    const hawkShPath = path.join(hawkScanPath, "hawk.ps1")
    const hawkPwshPath = path.join(hawkScanPath, "hawk")
    if (!fs.existsSync(hawkShPath)) {
        core.setFailed(`could not find ${hawkShPath}`)
    }
    if (!fs.existsSync(hawkPwshPath)) {
        core.setFailed(`could not find ${hawkPwshPath}`)
    }

    // Expose the tool by adding it to the PATH
    core.addPath(hawkScanPath);
    core.info(`added ${hawkScanPath} to the PATH`);
    return os.platform() === 'win32' ? hawkPwshPath : hawkShPath;
  } catch (e) {
    core.info(e);
    core.setFailed(e);
  }
}

module.exports = { setup };
