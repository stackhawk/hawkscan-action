import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import * as core from '@actions/core';

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
        core.debug(`Found applicationId ${applicationId} in ${configFile}`);
        return String(applicationId);
      }

      core.debug(`No applicationId found in ${configFile}`);
    } catch (error) {
      core.warning(`Failed to parse config file ${configFile}: ${error.message}`);
    }
  }

  return null;
}
