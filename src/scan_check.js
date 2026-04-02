import * as core from '@actions/core';

const STACKHAWK_API_BASE = 'https://api.stackhawk.com';

export async function authenticate(apiKey) {
  try {
    const response = await fetch(`${STACKHAWK_API_BASE}/api/v1/auth/login`, {
      method: 'GET',
      headers: {
        'X-ApiKey': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      core.warning(`StackHawk API auth failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    core.debug('Successfully authenticated with StackHawk API');
    return data.token;
  } catch (error) {
    core.warning(`StackHawk API auth error: ${error.message}`);
    return null;
  }
}

export async function searchScanBySha({ token, organizationId, applicationId, commitSha }) {
  const url = `${STACKHAWK_API_BASE}/api/v1/scan/${organizationId}?appIds=${applicationId}&tag=GIT_SHA:${commitSha}*&sortDir=desc&pageSize=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      core.warning(`StackHawk scan search failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.content || data.content.length === 0) {
      core.info('No existing scan found for this commit SHA');
      return null;
    }

    core.info(`Found existing scan for commit SHA: ${commitSha}`);
    return data.content[0];
  } catch (error) {
    core.warning(`StackHawk scan search error: ${error.message}`);
    return null;
  }
}

export async function lookupOrganizationId(token, applicationId) {
  const url = `${STACKHAWK_API_BASE}/api/v1/app/${applicationId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      core.warning(`StackHawk app lookup failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.organizationId) {
      core.warning('Application lookup did not return an organizationId');
      return null;
    }

    core.debug(`Found organizationId ${data.organizationId} for application ${applicationId}`);
    return data.organizationId;
  } catch (error) {
    core.warning(`StackHawk app lookup error: ${error.message}`);
    return null;
  }
}

export async function checkForExistingScan({ apiKey, organizationId, applicationId, commitSha }) {
  const token = await authenticate(apiKey);
  if (!token) {
    return null;
  }

  const resolvedOrgId = organizationId || await lookupOrganizationId(token, applicationId);
  if (!resolvedOrgId) {
    core.warning('Could not determine organizationId, falling back to normal scan');
    return null;
  }

  return searchScanBySha({ token, organizationId: resolvedOrgId, applicationId, commitSha });
}
