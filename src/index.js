const core = require('@actions/core');
const exec = require('@actions/exec');
// const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    console.log('Starting HawkScan Action');

    // Gather inputs
    const workspace = process.env.GITHUB_WORKSPACE;
    const apiKey = core.getInput('api-key');
    const environmentVariables = core.getInput('environment-variables').split(/[, \n]/);
    const configurationFiles = core.getInput('configuration-files');
    const network = core.getInput('network');
    const image = core.getInput('image');
    const version = core.getInput('version');
    const dryRun = core.getInput('dry-run');

    core.debug(`Environment Variables: ${environmentVariables} (${environmentVariables.length} length ${typeof environmentVariables})`);
    core.debug(`Is environmentVariables[0] equal to ''? ${(environmentVariables[0] === '')}`);

    // Build a list of --env VAR flags for the docker run command
    const dockerEnvironmentVariables = environmentVariables.reduce((accumulator, currentValue) => {
      if (currentValue === '') {
        return `${accumulator}`;
      } else {
        return `--env ${currentValue} ${accumulator}`.trim();
      }
    }, '');
    core.debug(`Docker Environment Variables: ${dockerEnvironmentVariables}`);

    // Build out the docker run command
    const dockerCommand = (`docker run --tty --rm --volume ${workspace}:/hawk ${dockerEnvironmentVariables} ` +
      `--env API_KEY=${apiKey} --network ${network} ${image}:${version} ${configurationFiles}`);
    core.debug(`Docker command: ${dockerCommand}`);

    // Run or dry-run the scanner
    if ( dryRun.toLowerCase() === 'true' ) {
      core.info(`DRY-RUN MODE: The following command[s] will not be run...`);
      core.info(dockerCommand);
    } else {
      core.info(`Running HawkScan: ${image}:${version}...`);
      try {
        await exec.exec(dockerCommand);
      } catch (error) {
        core.debug(error.toString());
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }

  core.info('Environment variable dump follows:')
  await exec.exec('env');
}

run();
