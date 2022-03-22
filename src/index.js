const core = require('@actions/core');
const utilities = require('./utilities');
const sarif = require('./sarif');
const { setup } = require('./setup');
const {addSignalHandler} = require("./signal_handler");

async function run() {
  core.info('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();
  const cliCommand = utilities.buildCLICommand(inputs);
  let exitCode = 0;
  let scanData;

  // Run the scanner
  core.info("Scanner Command: " + cliCommand);
  if ( inputs.dryRun === 'true' ) {
    core.info(`DRY-RUN MODE - The command will not be run:`);
  } else {
    // Install the CLI and set up signal handling
    addSignalHandler();
    await setup();
    // Run hawk command if installCLIOnly is false
    if (inputs.installCLIOnly !== 'true') {
      scanData = await utilities.runCommand(cliCommand);
      exitCode = scanData.exitCode;
      core.debug(`Scanner exit code: ${scanData.exitCode} (${typeof scanData.exitCode})`);
      core.debug(`Link to scan results: ${scanData.resultsLink} (${typeof scanData.resultsLink})`);
    }

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
