const core = require('@actions/core');
const exec = require('@actions/exec');

function gatherInputs() {
  return {
    workspace: process.env.GITHUB_WORKSPACE,
    apiKey: core.getInput('apiKey'),
    environmentVariables: core.getInput('environmentVariables').split(/[, \n]/),
    configurationFiles: core.getInput('configurationFiles'),
    network: core.getInput('network'),
    image: core.getInput('image'),
    version: core.getInput('version'),
    dryRun: core.getInput('dryRun')
  }
}

async function run() {
  try {
    console.log('Starting HawkScan Action');

    // Gather inputs
    const inputs = gatherInputs();



    core.debug(`Environment Variables: ${inputs.environmentVariables} (${inputs.environmentVariables.length} length ${typeof inputs.environmentVariables})`);
    core.debug(`Is environmentVariables[0] equal to ''? ${(inputs.environmentVariables[0] === '')}`);

    // Build a list of --env VAR flags for the docker run command
    const dockerEnvironmentVariables = inputs.environmentVariables.reduce((accumulator, currentValue) => {
      if (currentValue === '') {
        return `${accumulator}`;
      } else {
        return `--env ${currentValue} ${accumulator}`.trim();
      }
    }, '');
    core.debug(`Docker Environment Variables: ${dockerEnvironmentVariables}`);

    // Build out the docker run command
    const dockerCommand = (`docker run --tty --rm --volume ${inputs.workspace}:/hawk ${dockerEnvironmentVariables} ` +
      `--env API_KEY=${inputs.apiKey} --network ${inputs.network} ${inputs.image}:${inputs.version} ${inputs.configurationFiles}`);
    core.debug(`Docker command: ${dockerCommand}`);

    // Run or dry-run the scanner
    if ( inputs.dryRun.toLowerCase() === 'true' ) {
      core.info(`DRY-RUN MODE: The following command[s] will not be run...`);
      core.info(dockerCommand);
    } else {
      core.info(`Running HawkScan: ${inputs.image}:${inputs.version}...`);
      try {
        await exec.exec(dockerCommand);
      } catch (error) {
        core.debug(error.toString());
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
