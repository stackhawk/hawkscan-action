const core = require('@actions/core');
// const exec = require('@actions/exec');
// const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    console.log('Starting HawkScan Action');
    const workspace = process.env.GITHUB_WORKSPACE;
    const apiKey = core.getInput('api-key');
    const environmentVariables = core.getInput('environment-variables').split(" ");
    const configurationFiles = core.getInput('configuration-files');
    const network = core.getInput('network');
    const image = core.getInput('image');
    const version = core.getInput('version');


    core.debug(`Environment Variables: ${environmentVariables} (${environmentVariables.length} length)`);

    // Build a list of --env VAR flags for the docker run command
    const dockerEnvironmentVariables = environmentVariables.reduce((accumulator, currentValue) => {
      return `--env ${currentValue} ${accumulator}`.trim()
    }, '');
    core.debug(`Docker Environment Variables: ${dockerEnvironmentVariables}`);

    // Build out the docker run command
    const dockerCommand = (`docker run --tty --rm --volume ${workspace}:/hawk ${dockerEnvironmentVariables} ` +
      `--env API_KEY=${apiKey} --network ${network} ${image}:${version} ${configurationFiles}`);
    core.debug(`Docker command: ${dockerCommand}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
