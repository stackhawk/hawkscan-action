const core = require('@actions/core');
const { spawn } = require('child_process');
const { addChildProcessId } = require('./signal_handler')

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


function spawnChild(command, args) {
  const child = spawn(command,args)
  let stdout = '';
  let stderr = '';
  let response = {};

  if (child.stdout) {
    child.stdout.on('data', data => {
      stdout += data.toString();
      process.stdout.write(data);
    })
  }

  if (child.stderr) {
    child.stderr.on('data', data => {
      stderr += data.toString();
      process.stderr.write(data);
    })
  }

  const promise = new Promise((resolve, reject) => {
    child.on('error',(err) => {
      reject(err);
    });

    child.on('close', code => {
      if (code === 0) {
        response.stdout = stdout;
        response.code = code;
        resolve(response);
      } else {
        const err = new Error(`child exited with code ${code}`);
        response.stdout = stdout;
        response.code = code;
        err.code = code;
        err.stderr = stderr;
        err.stdout = stdout;
        reject(err);
      }
    })
  })

  promise.child = child

  addChildProcessId(child.pid);
  return promise
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
    githubToken: core.getInput('githubToken') || process.env['GITHUB_TOKEN'] || ''
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

// module.exports.runCommand = async function runCommand(command) {
//   core.debug(`Running command:`);
//   core.debug(command);
//
//   let execOutput = '';
//   let scanData = {};
//   let execOptions = {};
//   const commandArray = command.split(" ");
//   execOptions.ignoreReturnCode = true;
//   execOptions.listeners = {
//     stdout: (data) => {
//       execOutput += data.toString();
//     }
//   };
//
//   await exec.exec(commandArray[0], commandArray.slice(1), execOptions)
//     .then(data => {
//       scanData.exitCode = data;
//       scanData.resultsLink = scanParser(execOutput,
//         /(?<=View on StackHawk platform: )(?<group>.*)/m, 'group') || 'https://app.stackhawk.com';
//       scanData.failureThreshold = scanParser(execOutput,
//         /(?<=Error: [0-9]+ findings with severity greater than or equal to )(?<group>.*)/m, 'group') || '';
//       scanData.hawkscanVersion = scanParser(execOutput,
//         /(?<=StackHawk 🦅 HAWKSCAN - )(?<group>.*)/m, 'group') || 'v0';
//     })
//     .catch(error => {
//       core.error(error)
//     });
//   return scanData;
// }

module.exports.runCommand = async function runCommand(command) {
  core.debug(`Running command:`);
  core.debug(command);

  let scanData = {};
  const commandArray = command.split(" ");

  await spawnChild(commandArray[0], commandArray.slice(1))
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
