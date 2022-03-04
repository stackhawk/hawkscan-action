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

function stripAnsi(inputString) {
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  return inputString.replace(ansiRegex, '');
}

function scanParser(input, regex, captureGroup) {
  const matchResults = input.match(regex);
  let capturedString = null;
  if (matchResults && matchResults.groups && matchResults.groups[captureGroup]) {
    capturedString = matchResults.groups[captureGroup];
    core.debug(`Found captured string: ${capturedString}`);
  } else {
    core.debug(`Scan results regex parser expected to capture a string, but found only ${matchResults}`);
  }
  if (capturedString !== null) {
    return stripAnsi(capturedString)
  } else {
    return null
  }
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
    codeScanningAlerts: core.getInput('codeScanningAlerts').toLowerCase() || 'false',
    githubToken: core.getInput('githubToken') || process.env['GITHUB_TOKEN'] || ''
  }
}

// module.exports.buildDockerCommand = function buildDockerCommand(inputs) {
//   const dockerEnvironmentVariables = stringifyArguments(inputs.environmentVariables, '--env');
//   const dockerConfigurationFiles = stringifyArguments(inputs.configurationFiles);
//   const dockerCommand = (`docker run --tty --rm --volume ${inputs.workspace}:/hawk ${dockerEnvironmentVariables} ` +
//     `--env API_KEY=${inputs.apiKey} --network ${inputs.network} ${inputs.image}:${inputs.version} ` +
//     `${dockerConfigurationFiles}`);
//   const dockerCommandClean = dockerCommand.replace(/  +/g, ' ')
//   core.debug(`Docker command: ${dockerCommandClean}`);
//   return dockerCommandClean 
// }

module.exports.buildDockerCommand = function buildDockerCommand(inputs) {
  const dockerEnvironmentVariables = stringifyArguments(inputs.environmentVariables, '-e');
  const dockerConfigurationFiles = stringifyArguments(inputs.configurationFiles);
  const dockerCommand = (`hawk ${dockerEnvironmentVariables} ` +
      `-e API_KEY=${inputs.apiKey} ` +
      `${dockerConfigurationFiles}`);
  const dockerCommandClean = dockerCommand.replace(/  +/g, ' ')
  core.debug(`Docker command: ${dockerCommandClean}`);
  return dockerCommandClean
}

module.exports.runCommand = async function runCommand(command, cliPath) {
  core.debug(`Running command:`);
  core.debug(command);

  let execOutput = '';
  let scanData = {};
  let execOptions = {};
  const commandArray = cliPath.concat(command).split(" ");
  core.info(commandArray);
  execOptions.ignoreReturnCode = true;
  execOptions.listeners = {
    stdout: (data) => {
      execOutput += data.toString();
    }
  };

  await exec.exec(commandArray[0], commandArray.slice(1), execOptions)
    .then(data => {
      scanData.exitCode = data;
      scanData.resultsLink = scanParser(execOutput,
        /(?<=View on StackHawk platform: )(?<group>.*)/m, 'group') || 'https://app.stackhawk.com';
      scanData.failureThreshold = scanParser(execOutput,
        /(?<=Error: [0-9]+ findings with severity greater than or equal to )(?<group>.*)/m, 'group') || '';
      scanData.hawkscanVersion = scanParser(execOutput,
        /(?<=StackHawk 🦅 HAWKSCAN - )(?<group>.*)/m, 'group') || 'v0';
    })
    .catch(error => {
      core.error(error)
    });
  return scanData;
}
