const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const fs = require('fs');
const { getDownloadObject, getLatestVersion } = require('./cli_utils');
const {gatherInputs} = require('./utilities')

/**
 * Gets RUNNER_TEMP
 */
// function _getTempDirectory() {
//   const tempDirectory = process.env["RUNNER_TEMP"] || "";
//   return tempDirectory;
// }

// async function createDirectory(directoryPath) {
//   if (!fs.existsSync(directoryPath)) {
//     await fs.mkdirSync(directoryPath);
//   }
// }

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
    // const pathToDest = path.join(_getTempDirectory(), "hawkscan");

    // Create dest directory
    // core.info(`creating ${pathToDest}`);
    // createDirectory(pathToDest);

    // Extract the zip onto host runner
    const extract = download.url.endsWith(".zip")
      ? tc.extractZip
      : tc.extractTar;
    const pathToCLI = await extract(pathToTarball);
    core.info(`created ${pathToCLI}`);
    const hawkShPath = path.join(pathToCLI, "hawk.ps1")
    const hawkPwshPath = path.join(pathToCLI, "hawk")
    if (!fs.existsSync(hawkShPath)) {
        core.setFailed(`could not find ${hawkShPath}`)
    }
    if (!fs.existsSync(hawkPwshPath)) {
        core.setFailed(`could not find ${hawkPwshPath}`)
    }

    // Expose the tool by adding it to the PATH
    const hawkScanPath = path.join(pathToCLI, download.binPath)
    core.addPath(hawkScanPath);
    core.info(`added ${hawkScanPath} to the PATH`);
  } catch (e) {
    core.info(e);
    core.setFailed(e);
  }
}

module.exports = { setup };
