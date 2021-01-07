const wait = require('../src/wait');
const process = require('process');
const cp = require('child_process');
const path = require('path');

const ip = path.join('dist', 'index.js');

test('throws invalid number', async () => {
  await expect(wait('foo')).rejects.toThrow('milliseconds not a number');
});

test('wait 500 ms', async () => {
  const start = new Date();
  await wait(500);
  const end = new Date();
  let delta = Math.abs(end - start);
  expect(delta).toBeGreaterThanOrEqual(500);
});

test('minimal configuration dry-run', () => {
  process.env['INPUT_DRYRUN'] = "true";
  process.env['INPUT_APIKEY'] = "TEST_KEY";
  console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
  // console.log(cp.execSync(`env`, {env: process.env}).toString());
})

test('moderate configuration dry-run', () => {
  process.env['INPUT_DRYRUN'] = "true";
  process.env['INPUT_APIKEY'] = process.env['SHAWK_API_KEY'];
  process.env['INPUT_ENVIRONMENTVARIABLES'] = 'HOST';
  console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
  // console.log(cp.execSync(`env`, {env: process.env}).toString());
})

// shows how the runner will run a javascript action with env / stdout protocol
test('maxed-out configuration dry-run', () => {
  process.env['INPUT_DRYRUN'] = "true";
  process.env['INPUT_APIKEY'] = process.env['SHAWK_API_KEY'];
  process.env['INPUT_ENVIRONMENTVARIABLES'] = 'HOST APP_ENV APP_ID';
  process.env['INPUT_CONFIGURATIONFILES'] = 'stackhawktest.yml';
  process.env['INPUT_NETWORK'] = 'test_net';
  process.env['INPUT_IMAGE'] = 'stackhawk/hawkscantastic';
  process.env['INPUT_VERSION'] = 'best';
  process.env['HOST'] = 'mylittletesthost';
  process.env['APP_ENV'] = 'unit_tests';
  const command = cp.execSync(`node ${ip}`, {env: process.env}).toString()
  console.log(`command = ${command}`);
  // console.log(cp.execSync(`env`, {env: process.env}).toString());
})

// test('docker run hawkscan', () => {
//   process.env['INPUT_DRYRUN'] = 'false';
//   process.env['INPUT_APIKEY'] = process.env['SHAWK_API_KEY'];
//   process.env['INPUT_ENVIRONMENTVARIABLES'] = 'SHAWK_RESULTS_ENDPOINT SHAWK_AUTH_ENDPOINT';
//   process.env['INPUT_CONFIGURATIONFILES'] = 'test/stackhawk.yml';
//   process.env['INPUT_NETWORK'] = 'host';
//   process.env['INPUT_IMAGE'] = 'stackhawk/hawkscan';
//   process.env['INPUT_VERSION'] = 'latest';
//   console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
//   console.log(cp.execSync(`env`, {env: process.env}).toString());
// })
