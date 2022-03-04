const core = require('@actions/core');
const utilities = require('./utilities');
const sarif = require('./sarif');
const { setup } = require('./setup');

async function run() {
  core.info('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);
  let exitCode = 0;
  let scanData;

  // Run the scanner
  if ( inputs.dryRun === 'true' ) {
    core.info(`DRY-RUN MODE - The following command will not be run:`);
    core.info(dockerCommand);
  } else {
    const cliBin = await setup()
    scanData = await utilities.runCommand(dockerCommand, cliBin);
    exitCode = scanData.exitCode;
    core.debug(`Scanner exit code: ${scanData.exitCode} (${typeof scanData.exitCode})`);
    core.debug(`Link to scan results: ${scanData.resultsLink} (${typeof scanData.resultsLink})`);
  }

  // Upload SARIF data
  if (scanData && inputs.codeScanningAlerts === 'true' ) {
    if (exitCode === 0 || exitCode === 42) {
      await sarif.uploadSarif(scanData, inputs.githubToken);
    } else {
      core.error(`Skipping SARIF upload due to scan error.`)
    }
  }

  process.exit(exitCode);
}

run();
