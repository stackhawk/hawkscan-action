import fs from 'fs';
import * as core from '@actions/core';
import * as utilities from './utilities.js';
import * as sarif from './sarif.js';
import { setup } from './setup.js';
import { addSignalHandler } from './signal_handler.js';
import { parseApplicationId } from './config_parser.js';
import { checkForExistingScan } from './scan_check.js';
import { buildScanSummaryMarkdown, writeScanSummary, postPrComment } from './scan_summary.js';

function getHeadSha() {
  try {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    if (!eventPath) return process.env['GITHUB_SHA'] || null;
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.head?.sha || process.env['GITHUB_SHA'] || null;
  } catch {
    return process.env['GITHUB_SHA'] || null;
  }
}

async function runShaCheck(inputs) {
  if (inputs.commitShaCheck !== 'true') {
    return false;
  }

  core.info('Commit SHA check enabled, looking for existing scan results...');

  const applicationId = parseApplicationId(inputs.workspace, inputs.configurationFiles);
  if (!applicationId) {
    core.setFailed('Could not find applicationId in stackhawk configuration files');
    return true;
  }

  const commitSha = getHeadSha();
  if (!commitSha) {
    core.warning('Could not determine commit SHA, falling back to normal scan');
    return false;
  }

  core.info(`Searching for existing scan for commit: ${commitSha}`);

  const scanResult = await checkForExistingScan({
    apiKey: inputs.apiKey,
    applicationId,
    commitSha,
  });

  if (!scanResult) {
    core.info('No existing scan found for this commit SHA, running scan...');
    return false;
  }

  const scanId = scanResult.scan?.id || 'unknown';
  const scanUrl = scanResult.scan?.scanURL || `https://app.stackhawk.com/scans/${scanId}`;
  const thresholdExceeded = scanResult.scan?.status === 'FAILED' ||
    (scanResult.findings?.totalCount > 0 && scanResult.scan?.failureThresholdExceeded);

  core.setOutput('scanId', scanId);
  core.setOutput('resultsLink', scanUrl);

  const markdown = buildScanSummaryMarkdown({
    scanResult,
    commitSha,
    thresholdExceeded,
    failureMessage: thresholdExceeded ? `Findings exceed failure threshold` : '',
  });

  await writeScanSummary(markdown);
  await postPrComment({ githubToken: inputs.githubToken, markdown });

  if (thresholdExceeded) {
    core.setFailed(`Existing scan ${scanId} has findings that exceed the failure threshold. See: ${scanUrl}`);
  }

  return true;
}

async function run() {
  core.info('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();

  // Pre-check: look up existing scan by commit SHA
  const shaCheckHandled = await runShaCheck(inputs);
  if (shaCheckHandled) {
    return;
  }

  // Existing scan logic
  const cliCommand = utilities.buildCLICommand(inputs);
  let exitCode = 0;
  let scanData;

  if (inputs.dryRun !== 'true') {
    addSignalHandler();
    const hawkPath = await setup();
    if (inputs.installCLIOnly !== 'true') {
      scanData = await utilities.runCommand(hawkPath, cliCommand);
      exitCode = scanData.exitCode;
      core.debug(`Scanner exit code: ${scanData.exitCode} (${typeof scanData.exitCode})`);
      core.debug(`Link to scan results: ${scanData.resultsLink} (${typeof scanData.resultsLink})`);
      core.debug(`This is the scan id: ${scanData.scanId} (${typeof scanData.scanId})`);
      core.setOutput("scanId", scanData.scanId);
      if (exitCode !== 0) {
        core.setFailed(scanData.errorMessage)
      }
    }
  }

  if (scanData && inputs.codeScanningAlerts === 'true') {
    if (exitCode === 0 || exitCode === 42) {
      await sarif.uploadSarif(scanData, inputs.githubToken);
    } else {
      core.error(`Skipping SARIF upload due to scan error.`)
    }
  }

  process.exitCode = exitCode;
}

run();
