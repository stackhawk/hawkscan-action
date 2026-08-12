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

// Resolves the organization that owns an application.
//
// Uses the app-scoped endpoint rather than GET /api/v1/app/{appId}: that response
// omits organizationId entirely (yarak never populates the proto field), and because
// the path variable here is the application id, the platform evaluates plan
// enforcement against the owning org rather than whichever org we asked about. This
// mirrors PlatformApi.resolveApplicationAsync in the hawkscan CLI.
export async function lookupOrganizationId(token, applicationId) {
  const url = `${STACKHAWK_API_BASE}/api/v1/app/${applicationId}/org`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      core.warning(`StackHawk organization lookup failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const orgId = data.organization?.id;

    if (!orgId) {
      core.warning(`Organization lookup for application ${applicationId} did not return an organization`);
      return null;
    }

    core.debug(`Found organizationId ${orgId} for application ${applicationId}`);
    return orgId;
  } catch (error) {
    core.warning(`StackHawk organization lookup error: ${error.message}`);
    return null;
  }
}

export async function checkForExistingScan({ apiKey, applicationId, commitSha }) {
  const token = await authenticate(apiKey);
  if (!token) {
    return null;
  }

  const organizationId = await lookupOrganizationId(token, applicationId);
  if (!organizationId) {
    core.warning('Could not determine organizationId, falling back to normal scan');
    return null;
  }

  return searchScanBySha({ token, organizationId, applicationId, commitSha });
}
