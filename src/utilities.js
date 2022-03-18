const core = require('@actions/core');
const { spawnHawk } = require('./hawk_process')

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
    configurationFiles: stringToList(core.getInput('configurationFiles') || 'stackhawk.yml'),
    version: core.getInput('version') || 'latest',
    dryRun: core.getInput('dryRun').toLowerCase() || 'false',
    codeScanningAlerts: core.getInput('codeScanningAlerts').toLowerCase() || 'false',
    githubToken: core.getInput('githubToken') || process.env['GITHUB_TOKEN'] || '',
    installCLIOnly : core.getInput('installCLIOnly') || 'false',
    sourceURL : core.getInput('sourceURL') || 'https://download.stackhawk.com/hawk/cli'
  }
}

module.exports.buildCLICommand = function buildCLICommand(inputs) {
  const configurationFiles = stringifyArguments(inputs.configurationFiles);
  const cliCommand = (`hawk ` +
      `--api-key=${inputs.apiKey} ` +
      `scan ${configurationFiles}`);
  const cleanCliClean = cliCommand.replace(/  +/g, ' ')
  core.debug(`CLI command: ${cleanCliClean}`);
  return cleanCliClean
}

module.exports.runCommand = async function runCommand(command) {
  core.debug(`Running command:`);
  core.debug(command);

  let scanData = {};
  const commandArray = command.split(" ");

  await spawnHawk(commandArray[0], commandArray.slice(1))
      .then(data  => {
        scanData.exitCode = data.code;
        scanData.resultsLink = scanParser(data.stdout,
            /(?<=View on StackHawk platform: )(?<group>.*)/m, 'group') || 'https://app.stackhawk.com';
        scanData.failureThreshold = scanParser(data.stdout,
            /(?<=Error: [0-9]+ findings with severity greater than or equal to )(?<group>.*)/m, 'group') || '';
        scanData.hawkscanVersion = scanParser(data.stdout,
            /(?<=StackHawk 🦅 HAWKSCAN - )(?<group>.*)/m, 'group') || 'v0';
      })
      .catch(error => {
        core.error(error);
      });

  return scanData;
}
