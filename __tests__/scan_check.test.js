import { jest, beforeEach, describe, test, expect } from '@jest/globals';

// Mock @actions/core BEFORE importing modules that depend on it
jest.unstable_mockModule('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined),
  },
}));

const { authenticate, searchScanBySha, lookupOrganizationId, checkForExistingScan } = await import('../src/scan_check.js');
const core = await import('@actions/core');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks does not drain queued mockResolvedValueOnce values, so an
  // unconsumed response would leak into the next test and shift its call order.
  mockFetch.mockReset();
});

describe('authenticate', () => {
  test('returns bearer token on successful login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-bearer-token' }),
    });

    const token = await authenticate('test-api-key');
    expect(token).toBe('test-bearer-token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stackhawk.com/api/v1/auth/login',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-ApiKey': 'test-api-key',
        }),
      })
    );
  });

  test('returns null on auth failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const token = await authenticate('bad-key');
    expect(token).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const token = await authenticate('test-api-key');
    expect(token).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });
});

describe('searchScanBySha', () => {
  const baseParams = {
    token: 'test-token',
    organizationId: 'org-123',
    applicationId: 'app-456',
    commitSha: 'abc1234',
  };

  test('returns scan data when matching scan found', async () => {
    const scanResponse = {
      content: [
        {
          scan: {
            id: 'scan-789',
            status: 'COMPLETED',
            scanURL: 'https://app.stackhawk.com/scans/scan-789',
          },
          findings: {
            totalCount: 4,
            highCount: 1,
            mediumCount: 2,
            lowCount: 1,
          },
        },
      ],
      totalElements: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => scanResponse,
    });

    const result = await searchScanBySha(baseParams);
    expect(result).toEqual(scanResponse.content[0]);
    // _STACKHAWK_GIT_COMMIT_SHA is the reserved tag name the platform uses
    // (Nest ReservedScanTagNames.kt); the trailing * is a prefix match, which
    // yarak translates to a SQL LIKE on the tag value.
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/scan/org-123?appIds=app-456&tag=_STACKHAWK_GIT_COMMIT_SHA:abc1234*&sortDir=desc&pageSize=1`),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  test('returns null when no matching scan found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [], totalElements: 0 }),
    });

    const result = await searchScanBySha(baseParams);
    expect(result).toBeNull();
  });

  test('returns null on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await searchScanBySha(baseParams);
    expect(result).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    const result = await searchScanBySha(baseParams);
    expect(result).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });
});

describe('lookupOrganizationId', () => {
  // Shape of GetApplicationOrganizationResponse as returned by
  // GET /api/v1/app/{appId}/org (Nest organization.proto GetApplicationOrganizationResponse).
  const appOrgResponse = {
    organization: {
      id: 'org-derived-123',
      name: 'Test Org',
      plan: { type: 'BUSINESS' },
    },
  };

  test('returns the owning organization id for the application', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => appOrgResponse,
    });

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBe('org-derived-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stackhawk.com/api/v1/app/app-456/org',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  test('returns null on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const orgId = await lookupOrganizationId('test-token', 'bad-app');
    expect(orgId).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });

  test('returns null when response has no organization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });

  test('returns null when organization has no id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ organization: { name: 'Test Org' } }),
    });

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });
});

describe('checkForExistingScan', () => {
  test('resolves the owning org, then searches that org for the commit SHA', async () => {
    const scanData = {
      scan: { id: 'scan-789', status: 'COMPLETED' },
      findings: { totalCount: 2 },
    };

    // auth
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    // owning org lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ organization: { id: 'org-derived', name: 'Test Org' } }),
    });
    // scan search
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [scanData], totalElements: 1 }),
    });

    const result = await checkForExistingScan({
      apiKey: 'test-key',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toEqual(scanData);
    // auth + owning org lookup + scan search
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/v1/scan/org-derived?appIds=app-456&tag=_STACKHAWK_GIT_COMMIT_SHA:abc1234*'),
      expect.anything()
    );
  });

  test('returns null when auth fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await checkForExistingScan({
      apiKey: 'bad-key',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toBeNull();
  });

  test('returns null when orgId lookup fails', async () => {
    // auth
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    // owning org lookup fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await checkForExistingScan({
      apiKey: 'test-key',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toBeNull();
    // no scan search attempted without an org
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('returns null when no scan matches', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ organization: { id: 'org-derived' } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [], totalElements: 0 }),
    });

    const result = await checkForExistingScan({
      apiKey: 'test-key',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toBeNull();
  });
});
