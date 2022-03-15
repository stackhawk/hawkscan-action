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
  delete process.env.INPUT_ENVIRONMENTVARIABLES;
  delete process.env.INPUT_CONFIGURATIONFILES;
  delete process.env.INPUT_NETWORK;
  delete process.env.INPUT_IMAGE;
  delete process.env.INPUT_VERSION;
  delete process.env.INPUT_CODESCANNINGALERTS;
  delete process.env.INPUT_GITHUBTOKEN;
});

test('gather minimal inputs', () => {
  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: '',
    environmentVariables: [],
    githubToken: "",
    configurationFiles: ['stackhawk.yml'],
    network: 'host',
    image: 'stackhawk/hawkscan',
    version: 'latest',
    dryRun: 'false',
    codeScanningAlerts: 'false'
  });
});

test('gather max inputs', () => {
  buildInput({
    apiKey: 'testkey',
    environmentVariables: 'one, two\nthree four  five,,six,\n\n seven, ',
    githubToken: "gh.xXx.XxX",
    configurationFiles: "one.yml two.yml, three.yml\nfour.yml  five.yaml,,six.yml,\n\n seven.yml, ",
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true',
    codeScanningAlerts: 'true'
  });

  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: 'testkey',
    environmentVariables: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'],
    githubToken: "gh.xXx.XxX",
    configurationFiles: ['one.yml', 'two.yml', 'three.yml', 'four.yml', 'five.yaml', 'six.yml', 'seven.yml'],
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true',
    codeScanningAlerts: 'true'
  });
});

test('minimal configuration dry-run', () => {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX'
  });
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);
  expect(dockerCommand)
    .toEqual(`docker run --tty --rm --volume ${workspace}:/hawk --env API_KEY=hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX ` +
    `--network host stackhawk/hawkscan:latest stackhawk.yml`);
});

test('maxed-out configuration dry-run', () => {
  buildInput({
    dryRun: 'true',
    apiKey: 'hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX',
    environmentVariables: 'HOST APP_ENV',
    configurationFiles: "stackhawk.yml stackhawktest.yml",
    network: 'test_net',
    image: 'stackhawk/hawkscantastic',
    version: 'best',
  });
  process.env['HOST'] = 'mylittletesthost';
  process.env['APP_ENV'] = 'unit_tests';
  const inputs = utilities.gatherInputs();
  const dockerCommand = utilities.buildDockerCommand(inputs);
  expect(dockerCommand)
    .toEqual(`docker run --tty --rm --volume ${workspace}:/hawk --env HOST --env APP_ENV ` +
    `--env API_KEY=hawk.xxxxXXXXxxXXxxxXXxXX.xxxXXxxxXXxxXXxxxXXX --network test_net stackhawk/hawkscantastic:best ` +
    `stackhawk.yml stackhawktest.yml`);
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
  const downloadObject = getDownloadObject('2.1.0');
  expect(downloadObject.url).toEqual('https://download.stackhawk.com/hawk/cli/hawk-2.1.0.zip');
  expect(downloadObject.binPath).toEqual('/hawk-2.1.0');
});
