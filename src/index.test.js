const wait = require('./wait');
const process = require('process');
const cp = require('child_process');
const path = require('path');

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

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_API-KEY'] = process.env['SHAWK_API_KEY'];
  process.env['INPUT_ENVIRONMENT-VARIABLES'] = 'HOST APP_ENV APP_ID';
  process.env['INPUT_CONFIGURATIONS-FILES'] = 'stackhawktest.yml';
  process.env['INPUT_NETWORK'] = 'test_net';
  process.env['INPUT_IMAGE'] = 'stackhawk/hawkscantastic';
  process.env['INPUT_VERSION'] = 'best';
  process.env['HOST'] = 'mylittletesthost';
  process.env['APP_ENV'] = 'unit_tests';
  const ip = path.join(__dirname, 'index.js');
  console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
})
