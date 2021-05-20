const core = require('@actions/core');
const utilities = require('./utilities');

function uploadSarif(resultsLink) {
  core.debug(`Running SARIF upload with results link ${resultsLink}`);
}

async function run() {
  console.log('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);
  let exitCode = 0;
  let scanResults;
  let resultsLink;

  // Run the scanner
  if ( inputs.dryRun === 'true' ) {
    core.info(`DRY-RUN MODE - The following command will not be run:`);
    core.info(dockerCommand);
  } else {
    scanResults = await utilities.runCommand(dockerCommand);
    resultsLink = scanResults.resultsLink;
    exitCode = scanResults.exitCode;
    core.debug(`Scanner exit code: ${exitCode} (${typeof exitCode})`);
    core.debug(`Link to scan results: ${resultsLink} (${typeof resultsLink})`);
  }

  // Upload SARIF data
  // if ( exitCode === 42 && resultsLink && inputs.codeScanningAlerts.toLowerCase() === 'true') {
  if ( exitCode === 42 && resultsLink && inputs.codeScanningAlerts === 'true' ) {
    await uploadSarif(resultsLink);
  }

  process.exit(exitCode);
}

run();
