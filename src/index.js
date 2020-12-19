const core = require('@actions/core');
// const exec = require('@actions/exec');
// const wait = require('./wait');

let envArgs = "";
function buildDockerEnvironmentVariables(value) {
  envArgs = `${envArgs} --env ${value}`.trim()
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    // let githubEnv = process.env.GITHUB_ENV;
    const workspace = process.env.GITHUB_WORKSPACE;
    const apiKey = core.getInput('api-key');
    const environmentVariables = core.getInput('environment-variables').split(" ");
    const configurationFiles = core.getInput('configuration-files');
    const network = core.getInput('network');
    const image = core.getInput('image');
    const version = core.getInput('version');

    const dockerEnvironmentVariables = environmentVariables.forEach(buildDockerEnvironmentVariables)
    const dockerCommand = (`docker run -t --rm -v ${workspace}:/hawk ${dockerEnvironmentVariables} ` +
      `--env API_KEY=${apiKey} --network ${network} ${image}:${version} ${configurationFiles}`);

    core.info(dockerCommand)

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
