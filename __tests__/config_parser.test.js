import { parseApplicationId } from '../src/config_parser.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('parseApplicationId', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hawkscan-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('parses applicationId from standard stackhawk.yml', () => {
    const configContent = `
app:
  applicationId: 3b96390e-4c87-410e-bba3-460c9b2177cf
  host: https://localhost:9000
  env: Development
`;
    fs.writeFileSync(path.join(tmpDir, 'stackhawk.yml'), configContent);
    const result = parseApplicationId(tmpDir, ['stackhawk.yml']);
    expect(result).toBe('3b96390e-4c87-410e-bba3-460c9b2177cf');
  });

  test('parses applicationId from first config file in list', () => {
    const configContent = `
app:
  applicationId: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
  host: https://example.com
`;
    fs.writeFileSync(path.join(tmpDir, 'custom.yml'), configContent);
    const result = parseApplicationId(tmpDir, ['custom.yml']);
    expect(result).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  // HawkScan interpolates ${VAR} and ${VAR:default} in stackhawk.yml, so configs
  // in the wild routinely keep applicationId in an env var. Reading the raw YAML
  // value yields the literal placeholder, which is not a usable application id.
  describe('environment variable interpolation', () => {
    const ORIGINAL_ENV = process.env.APPLICATION_ID;

    afterEach(() => {
      if (ORIGINAL_ENV === undefined) {
        delete process.env.APPLICATION_ID;
      } else {
        process.env.APPLICATION_ID = ORIGINAL_ENV;
      }
    });

    function writeConfig(applicationId) {
      fs.writeFileSync(
        path.join(tmpDir, 'stackhawk.yml'),
        `app:\n  applicationId: "${applicationId}"\n  host: https://localhost:9000\n`
      );
    }

    test('substitutes the environment variable value', () => {
      process.env.APPLICATION_ID = '4030d674-88b7-4e07-8065-7761f9c63788';
      writeConfig('${APPLICATION_ID}');
      expect(parseApplicationId(tmpDir, ['stackhawk.yml'])).toBe('4030d674-88b7-4e07-8065-7761f9c63788');
    });

    test('prefers the environment variable over the default', () => {
      process.env.APPLICATION_ID = '4030d674-88b7-4e07-8065-7761f9c63788';
      writeConfig('${APPLICATION_ID:test-app-id}');
      expect(parseApplicationId(tmpDir, ['stackhawk.yml'])).toBe('4030d674-88b7-4e07-8065-7761f9c63788');
    });

    test('falls back to the default when the variable is unset', () => {
      delete process.env.APPLICATION_ID;
      writeConfig('${APPLICATION_ID:test-app-id}');
      expect(parseApplicationId(tmpDir, ['stackhawk.yml'])).toBe('test-app-id');
    });

    test('leaves the placeholder intact when unset with no default', () => {
      delete process.env.APPLICATION_ID;
      writeConfig('${APPLICATION_ID}');
      expect(parseApplicationId(tmpDir, ['stackhawk.yml'])).toBe('${APPLICATION_ID}');
    });
  });

  test('returns null when config file does not exist', () => {
    const result = parseApplicationId(tmpDir, ['nonexistent.yml']);
    expect(result).toBeNull();
  });

  test('returns null when applicationId is missing from config', () => {
    const configContent = `
app:
  host: https://localhost:9000
`;
    fs.writeFileSync(path.join(tmpDir, 'stackhawk.yml'), configContent);
    const result = parseApplicationId(tmpDir, ['stackhawk.yml']);
    expect(result).toBeNull();
  });

  test('returns null when app section is missing', () => {
    const configContent = `
host: https://localhost:9000
`;
    fs.writeFileSync(path.join(tmpDir, 'stackhawk.yml'), configContent);
    const result = parseApplicationId(tmpDir, ['stackhawk.yml']);
    expect(result).toBeNull();
  });

  test('tries second config file if first has no applicationId', () => {
    const config1 = `
app:
  host: https://localhost:9000
`;
    const config2 = `
app:
  applicationId: 11111111-2222-3333-4444-555555555555
  host: https://example.com
`;
    fs.writeFileSync(path.join(tmpDir, 'base.yml'), config1);
    fs.writeFileSync(path.join(tmpDir, 'override.yml'), config2);
    const result = parseApplicationId(tmpDir, ['base.yml', 'override.yml']);
    expect(result).toBe('11111111-2222-3333-4444-555555555555');
  });
});
