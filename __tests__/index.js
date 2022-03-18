const utilities = require('../src/utilities');
const process = require('process');
const { getDownloadObject } = require('../src/cli_utils');

// Our workspace should be GITHUB_WORSPACE if it exists, or the current working directory otherwise
const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

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
  delete process.env.INPUT_CONFIGURATIONFILES;
  delete process.env.INPUT_VERSION;
  delete process.env.INPUT_CODESCANNINGALERTS;
  delete process.env.INPUT_GITHUBTOKEN;
  delete process.env.INPUT_INSTALLCLIONLY;
  delete process.env.INPUT_SOURCEURL;
});

test('gather minimal inputs', () => {
  expect(utilities.gatherInputs()).toEqual({
    apiKey: '',
    githubToken: "",
    configurationFiles: ['stackhawk.yml'],
    version: 'latest',
    dryRun: 'false',
    installCLIOnly : 'false',
    codeScanningAlerts: 'false',
    workspace : workspace,
    sourceURL : 'https://download.stackhawk.com/hawk/cli'
  });
});

test('gather max inputs', () => {
  buildInput({
    apiKey: 'testkey',
    githubToken: "gh.xXx.XxX",
    configurationFiles: "one.yml two.yml, three.yml\nfour.yml  five.yaml,,six.yml,\n\n seven.yml, ",
    version: 'latest',
    dryRun: 'true',
    codeScanningAlerts: 'true',
    installCLIOnly : 'true',
    sourceURL : 'https://test.download.stackhawk.com/hawk/cli'
  });

  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: 'testkey',
    githubToken: "gh.xXx.XxX",
    configurationFiles: ['one.yml', 'two.yml', 'three.yml', 'four.yml', 'five.yaml', 'six.yml', 'seven.yml'],
    version: 'latest',
    dryRun: 'true',
    codeScanningAlerts: 'true',
    installCLIOnly : 'true',
    sourceURL : 'https://test.download.stackhawk.com/hawk/cli'
  });
});

test('cli dry-run', () => {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX',
    version: '2.1.0'
  });
  const inputs = utilities.gatherInputs();
  const cliCommand  = utilities.buildCLICommand(inputs);
  expect(cliCommand)
      .toEqual(`hawk --api-key=hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX scan stackhawk.yml`);
});

test('get download object', () => {
  const downloadObject = getDownloadObject('2.1.0', 'https://download.stackhawk.com/hawk/cli');
  expect(downloadObject.url).toEqual('https://download.stackhawk.com/hawk/cli/hawk-2.1.0.zip');
  expect(downloadObject.binPath).toEqual('/hawk-2.1.0');
});

test('get custom url download object', () => {
  const downloadObject = getDownloadObject('2.1.0', 'https://download.test.stackhawk.com/hawk/cli');
  expect(downloadObject.url).toEqual('https://download.test.stackhawk.com/hawk/cli/hawk-2.1.0.zip');
  expect(downloadObject.binPath).toEqual('/hawk-2.1.0');
})
