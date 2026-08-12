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

export function parseApplicationId(workspace, configurationFiles) {
  for (const configFile of configurationFiles) {
    const configPath = path.join(workspace, configFile);

    if (!fs.existsSync(configPath)) {
      core.debug(`Config file not found: ${configPath}`);
      continue;
    }

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents);
      const applicationId = config?.app?.applicationId;

      if (applicationId) {
        const resolved = interpolateEnv(String(applicationId));
        core.debug(`Found applicationId ${resolved} in ${configFile}`);
        return resolved;
      }

      core.debug(`No applicationId found in ${configFile}`);
    } catch (error) {
      core.warning(`Failed to parse config file ${configFile}: ${error.message}`);
    }
  }

  return null;
}
