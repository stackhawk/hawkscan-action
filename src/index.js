const core = require('@actions/core');
const utilities = require('./utilities');
const sarif = require('./sarif');

async function run() {
  console.log('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);
  let exitCode = 0;
  let scanResults;
  let scanData;

  // Run the scanner
  if ( inputs.dryRun === 'true' ) {
    core.info(`DRY-RUN MODE - The following command will not be run:`);
    core.info(dockerCommand);
  } else {
    scanResults = await utilities.runCommand(dockerCommand);
    scanData = scanResults.scanData;
    exitCode = scanResults.exitCode;
    core.debug(`Scanner exit code: ${exitCode} (${typeof exitCode})`);
    core.debug(`Link to scan results: ${scanData.resultsLink} (${typeof scanData.resultsLink})`);
  }

  // Upload SARIF data
  // if ( exitCode === 42 && resultsLink && inputs.codeScanningAlerts.toLowerCase() === 'true') {
  if ( exitCode === 42 && scanData && inputs.codeScanningAlerts === 'true' ) {
    await sarif.uploadSarif(scanData);
  }

  process.exit(exitCode);
}

run();
