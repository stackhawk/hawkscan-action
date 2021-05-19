const core = require('@actions/core');
const utilities = require('./utilities');

async function run() {
  console.log('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);

  // let scanResults = {exitCode: 0, execOutput: '', execError: ''};

  // Run the scanner
  if ( inputs.dryRun.toLowerCase() === 'true' ) {
    core.info(`DRY-RUN MODE - The following command will not be run:`);
    core.info(dockerCommand);
  } else {
    const scanResults = await utilities.runCommand(dockerCommand)
    core.info("Here's what happened.");
    core.info(scanResults.exitCode.toString());
    core.info('all done');
  }
}

run();
