import path from 'path';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import fs from 'fs';
import os from 'os';
import { getDownloadObject, getLatestVersion } from './cli_utils.js';
import { gatherInputs } from './utilities.js';

/*
Returns the path of the hawkscan executable to run for the respective OS
*/
export async function setup() {
  try {
    const inputs = gatherInputs();
    // Get version of tool to be installed
    const version = inputs.version;
    const sourceUrl = inputs.sourceURL;

    // Download the specific version of the tool, e.g. as a tarball/zipball
    const cliVersion =
      version === "latest" ? await getLatestVersion() : version;
    const download = getDownloadObject(cliVersion, sourceUrl);

    let hawkExecutable;
    if (download.isBinary) {
      // Binary path: download single file, chmod, add parent dir to PATH
      const downloadedPath = await tc.downloadTool(download.url);
      const binDir = path.join(os.tmpdir(), `hawk-bin-${cliVersion}`);
      fs.mkdirSync(binDir, { recursive: true });
      const binaryPath = path.join(binDir, download.binaryName);
      fs.copyFileSync(downloadedPath, binaryPath);
      fs.unlinkSync(downloadedPath);
      if (os.platform() !== 'win32') {
        fs.chmodSync(binaryPath, '755');
      }
      core.addPath(binDir);
      hawkExecutable = binaryPath;
      core.info(`installed ${cliVersion} binary to ${binaryPath}`);
    } else {
      // Legacy ZIP path — unchanged
      const pathToTarball = await tc.downloadTool(download.url);
      const extract = download.url.endsWith(".zip")
        ? tc.extractZip
        : tc.extractTar;
      const pathToCLI = await extract(pathToTarball);
      const hawkScanPath = path.join(pathToCLI, download.binPath);
      const hawkShPath = path.join(hawkScanPath, "hawk");
      const hawkPwshPath = path.join(hawkScanPath, "hawk.ps1");
      if (!fs.existsSync(hawkShPath)) {
        core.setFailed(`could not find ${hawkShPath}`);
        return;
      }
      if (!fs.existsSync(hawkPwshPath)) {
        core.setFailed(`could not find ${hawkPwshPath}`);
        return;
      }
      core.addPath(hawkScanPath);
      hawkExecutable = os.platform() === 'win32' ? hawkPwshPath : hawkShPath;
    }
    return hawkExecutable;
  } catch (e) {
    core.info(e);
    core.setFailed(e);
  }
}
