import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import * as core from '@actions/core';

// HawkScan interpolates ${VAR} and ${VAR:default} when it reads stackhawk.yml, so
// applicationId is frequently an env var rather than a literal. We read the YAML
// ourselves and must do the same, or we hand the API a placeholder string instead
// of an application id. An unset variable with no default is left as-is so the
// resulting lookup failure names the placeholder.
function interpolateEnv(value) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}/g, (placeholder, name, defaultValue) => {
    const fromEnv = process.env[name];
    if (fromEnv !== undefined && fromEnv !== '') {
      return fromEnv;
    }
    return defaultValue !== undefined ? defaultValue : placeholder;
  });
}

// Returns the first value `select` finds across the configuration files, in the
// order HawkScan itself would apply them.
function readFromConfigs(workspace, configurationFiles, select, label) {
  for (const configFile of configurationFiles) {
    const configPath = path.join(workspace, configFile);

    if (!fs.existsSync(configPath)) {
      core.debug(`Config file not found: ${configPath}`);
      continue;
    }

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const value = select(yaml.load(fileContents));

      if (value) {
        const resolved = interpolateEnv(String(value));
        core.debug(`Found ${label} ${resolved} in ${configFile}`);
        return resolved;
      }

      core.debug(`No ${label} found in ${configFile}`);
    } catch (error) {
      core.warning(`Failed to parse config file ${configFile}: ${error.message}`);
    }
  }

  return null;
}

export function parseApplicationId(workspace, configurationFiles) {
  return readFromConfigs(workspace, configurationFiles, (config) => config?.app?.applicationId, 'applicationId');
}

// hawk.failureThreshold is the severity at which HawkScan fails a scan (high,
// medium, or low). A reused scan carries no pass/fail flag of its own, so we read
// the same setting the scan itself would have used.
export function parseFailureThreshold(workspace, configurationFiles) {
  return readFromConfigs(workspace, configurationFiles, (config) => config?.hawk?.failureThreshold, 'failureThreshold');
}
