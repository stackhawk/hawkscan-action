#!/usr/bin/env node
const utilities = require('../src/utilities');
const process = require('process');
const { spawn } = require('child_process');

// Take an object of key/value pairs and convert it to input environment variables
function buildInput(inputs) {
  let key = "";
  for(key in inputs) {
    process.env[`INPUT_${key.replace(/ /g, '_').toUpperCase()}`] = inputs[key];
  }
}

function run() {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX',
    configurationFiles: "__tests__/stackhawk.yml",
    version: 'latest',
    codeScanningAlerts: 'true',
  });
  process.env['HOST'] = 'http://example.com';
  process.env['APP_ENV'] = 'unit_tests';
  const inputs = utilities.gatherInputs();
  const cliCommand = utilities.buildCLICommand(inputs);
  const scanCommandList = cliCommand.split(" ");
  const scanCommand = scanCommandList[0];
  const scanArgs = scanCommandList.slice(1);
  const scanner = spawn(scanCommand, scanArgs);

  scanner.stdout.on("data", data => {
    console.log(data.toString());
  });
  scanner.stderr.on("data", data => {
    console.error(`stderr: ${data}`);
  });
  scanner.on("error", (error) => {
    console.error(`ERROR: ${error}`);
  });
  scanner.on("close", code => {
    console.log(`Scanner process exited with code ${code}`);
  });
}

run()
