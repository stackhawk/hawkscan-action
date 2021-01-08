// const wait = require('../src/wait');
const utilities = require('../src/utilities');
const process = require('process');
const cp = require('child_process');
const path = require('path');

const ip = path.join('dist', 'index.js');

// Take an object of key/value pairs and convert it to input environment variables
function buildInput(inputs) {
  let key = "";
  for(key in inputs) {
    process.env[`INPUT_${key.replace(/ /g, '_').toUpperCase()}`] = inputs[key];
  }
}

// Reset modules and remove input environment variables before each run
beforeEach(() => {
  jest.resetModules();
  delete process.env.INPUT_DRYRUN;
  delete process.env.INPUT_APIKEY;
  delete process.env.INPUT_ENVIRONMENTVARIABLES;
  delete process.env.INPUT_CONFIGURATIONFILES;
  delete process.env.INPUT_NETWORK;
  delete process.env.INPUT_IMAGE;
  delete process.env.INPUT_VERSION;
});

test('gather minimal inputs', () => {
  const workspace = process.env.GITHUB_WORKSPACE || ''
  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: '',
    environmentVariables: [],
    configurationFiles: ['stackhawk.yml'],
    network: 'host',
    image: 'stackhawk/hawkscan',
    version: 'latest',
    dryRun: 'false'
  })
})

test('gather max inputs', () => {
  const workspace = process.env.GITHUB_WORKSPACE || ''
  buildInput({
    apiKey: 'testkey',
    environmentVariables: 'this, that\nthem other',
    configurationFiles: "one two, three\nfour",
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true'
  })

  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: 'testkey',
    environmentVariables: ['this', 'that', 'them', 'other'],
    configurationFiles: ['one', 'two', 'three', 'four'],
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true'
  })
})

test('minimal configuration dry-run', () => {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX'
  })
  console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
})

test('maxed-out configuration dry-run', () => {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX',
    environmentVariables: 'HOST APP_ENV',
    configurationFiles: "stackhawk.yml stackhawktest.yml",
    network: 'test_net',
    image: 'stackhawk/hawkscantastic',
    version: 'best',
  })
  process.env['HOST'] = 'mylittletesthost';
  process.env['APP_ENV'] = 'unit_tests';
  console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
})
