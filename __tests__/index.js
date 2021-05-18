const utilities = require('../src/utilities');
const process = require('process');

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
});

test('gather minimal inputs', () => {
  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: '',
    environmentVariables: [],
    configurationFiles: ['stackhawk.yml'],
    network: 'host',
    image: 'stackhawk/hawkscan',
    version: 'latest',
    dryRun: 'false'
  });
});

test('gather max inputs', () => {
  buildInput({
    apiKey: 'testkey',
    environmentVariables: 'one, two\nthree four  five,,six,\n\n seven, ',
    configurationFiles: "one.yml two.yml, three.yml\nfour.yml  five.yaml,,six.yml,\n\n seven.yml, ",
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true'
  });

  expect(utilities.gatherInputs()).toEqual({
    workspace: workspace,
    apiKey: 'testkey',
    environmentVariables: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'],
    configurationFiles: ['one.yml', 'two.yml', 'three.yml', 'four.yml', 'five.yaml', 'six.yml', 'seven.yml'],
    network: 'nothingbutnet',
    image: 'nginx',
    version: 'remarkable',
    dryRun: 'true'
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
