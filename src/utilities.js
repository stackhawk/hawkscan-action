const core = require('@actions/core');
const exec = require('@actions/exec');

function checkNotEmpty(element) {
  return (element !== null && element !== "");
}

module.exports.gatherInputs = function gatherInputs() {
  let configurationFiles = core.getInput('configurationFiles')
    .split(/[, \n]/)
    .filter(checkNotEmpty);
  if (configurationFiles.length === 0) {
    configurationFiles = ['stackhawk.yml'];
  }
  return {
    workspace: process.env.GITHUB_WORKSPACE || '',
    apiKey: core.getInput('apiKey') || '',
    environmentVariables: core.getInput('environmentVariables')
      .split(/[, \n]/)
      .filter(checkNotEmpty),
    configurationFiles: configurationFiles,
    network: core.getInput('network') || 'host',
    image: core.getInput('image') || 'stackhawk/hawkscan',
    version: core.getInput('version') || 'latest',
    dryRun: core.getInput('dryRun') || 'false'
  }
}

function stringifyArguments(list, prefix = '') {
  return list.reduce((accumulator, currentValue) => {
    if (currentValue === '') {
      return `${accumulator}`;
    } else {
      return `${accumulator} ${prefix} ${currentValue}`.trim();
    }
  }, '')
}

module.exports.buildDockerCommand = function buildDockerCommand(inputs) {
  const dockerEnvironmentVariables = stringifyArguments(inputs.environmentVariables, '--env');
  const dockerConfigurationFiles = stringifyArguments(inputs.configurationFiles);
  const dockerCommand = (`docker run --tty --rm --volume ${inputs.workspace}:/hawk ${dockerEnvironmentVariables} ` +
    `--env API_KEY=${inputs.apiKey} --network ${inputs.network} ${inputs.image}:${inputs.version} ` +
    `${dockerConfigurationFiles}`);
  const dockerCommandClean = dockerCommand.replace(/  +/g, ' ')
  core.debug(`Docker command: ${dockerCommandClean}`);
  return dockerCommandClean
}


module.exports.runCommand = function runCommand(command) {
  core.info(`Running command:`);
  core.info(command);
  try {
    exec.exec(command);
  } catch (error) {
    core.debug(error.toString());
  }
}
