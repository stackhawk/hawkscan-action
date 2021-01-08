const core = require('@actions/core');
const utilities = require('./utilities');


async function run() {
  try {
    console.log('Starting HawkScan Action');

    // Gather inputs
    const inputs = utilities.gatherInputs();

    // Build our Docker command
    const dockerCommand = utilities.buildDockerCommand(inputs);

    // Run the scanner
    if ( inputs.dryRun.toLowerCase() === 'true' ) {
      core.info(`DRY-RUN MODE - The following command[s] will not be run:`);
      core.info(dockerCommand);
    } else {
      await utilities.runCommand(dockerCommand);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
