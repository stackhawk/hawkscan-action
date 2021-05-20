const core = require('@actions/core');
const exec = require('@actions/exec');

// A filter that returns 'true' if an element contains anything other than null or an empty string
function checkNotEmpty(element) {
  return (element !== null && element !== "");
}

// Convert a string to a list of strings. Separator can be any mix of commas, spaces, or newlines
function stringToList(list) {
  return list
    .split(/[, \n]/)
    .filter(checkNotEmpty);
}

// Produce a list of arguments from a list, like ['API_KEY', 'APP_ENV', 'HOST'], and a prefix, like '--env'
function stringifyArguments(list, prefix = '') {
  return list.reduce((accumulator, currentValue) => {
    if (currentValue === '') {
      return `${accumulator}`;
    } else {
      return `${accumulator} ${prefix} ${currentValue}`.trim();
    }
  }, '')
}

function linkFinder(input) {
  const regex = /(?<=View on StackHawk platform: )(?<link>.*)/m;
  const results = input.match(regex);
  let link = null;
  if (results && results.groups && results.groups.link) {
    link = results.groups.link;
    core.debug(`Found link to scan results: ${link}`);
  } else {
    core.error(`ERROR: expected a results link, but found only ${results}`);
  }
  return link;
}

// Gather all conditioned inputs
module.exports.gatherInputs = function gatherInputs() {
  return {
    workspace: process.env.GITHUB_WORKSPACE || process.cwd(),
    apiKey: core.getInput('apiKey') || '',
    environmentVariables: stringToList(core.getInput('environmentVariables')),
    configurationFiles: stringToList(core.getInput('configurationFiles') || 'stackhawk.yml'),
    network: core.getInput('network') || 'host',
    image: core.getInput('image') || 'stackhawk/hawkscan',
    version: core.getInput('version') || 'latest',
    dryRun: core.getInput('dryRun').toLowerCase() || 'false',
    codeScanningAlerts: core.getInput('codeScanningAlerts').toLowerCase() || 'false'
  }
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

module.exports.runCommand = async function runCommand(command) {
  core.debug(`Running command:`);
  core.debug(command);

  let execOutput = '';
  let exitCode = 0;
  let resultsLink = '';
  let execOptions = {};
  const commandArray = command.split(" ");
  execOptions.ignoreReturnCode = true;
  execOptions.listeners = {
    stdout: (data) => {
      execOutput += data.toString();
    }
  };

  await exec.exec(commandArray[0], commandArray.slice(1), execOptions)
    .then(data => {
      exitCode = data;
      resultsLink = linkFinder(execOutput);
    })
    .catch(error => {core.error(error)});
  return {exitCode, resultsLink};
}
