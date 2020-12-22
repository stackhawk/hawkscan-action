const core = require('@actions/core');
// const exec = require('@actions/exec');
// const wait = require('./wait');

let envArgs = "";
function buildDockerEnvironmentVariables(value) {
  console.log(value)
  envArgs = `${envArgs} --env ${value}`.trim()
  return envArgs
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    console.log('Starting HawkScan Action');
    // let githubEnv = process.env.GITHUB_ENV;
    let workspace = process.env.GITHUB_WORKSPACE;
    const apiKey = core.getInput('api-key');
    const environmentVariables = core.getInput('environment-variables').split(" ");
    const configurationFiles = core.getInput('configuration-files');
    const network = core.getInput('network');
    const image = core.getInput('image');
    const version = core.getInput('version');

    let dockerEnvironmentVariables = await environmentVariables.forEach(buildDockerEnvironmentVariables);
    console.log(`Environment Variables: ${dockerEnvironmentVariables}`);
    if (dockerEnvironmentVariables === undefined ) {
      dockerEnvironmentVariables = '';
    }
    console.log(`Environment Variables: ${dockerEnvironmentVariables}`);

    const dockerCommand = (`docker run -t --rm -v ${workspace}:/hawk ${dockerEnvironmentVariables} ` +
      `--env API_KEY=${apiKey} --network ${network} ${image}:${version} ${configurationFiles}`);

    console.log(`Docker command: ${dockerCommand}`);
    core.info(dockerCommand);

    // core.info(`Waiting ${ms} milliseconds ...`);
    // core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true

    // await wait(parseInt(ms));
    core.info((new Date()).toTimeString());

    // const envVars = process.env
    // console.log(`All the environment variables: ${envVars}`);

    // core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
