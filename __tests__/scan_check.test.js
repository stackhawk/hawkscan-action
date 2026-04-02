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
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/scan/org-123?appIds=app-456&tag=GIT_SHA:abc1234*&sortDir=desc&pageSize=1`),
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
  test('returns organizationId from app lookup', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ applicationId: 'app-456', organizationId: 'org-derived-123' }),
    });

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBe('org-derived-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stackhawk.com/api/v1/app/app-456',
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

  test('returns null when response missing organizationId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ applicationId: 'app-456' }),
    });

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const orgId = await lookupOrganizationId('test-token', 'app-456');
    expect(orgId).toBeNull();
    expect(core.warning).toHaveBeenCalled();
  });
});

describe('checkForExistingScan', () => {
  test('returns scan result when found with explicit orgId', async () => {
    const scanData = {
      scan: { id: 'scan-789', status: 'COMPLETED' },
      findings: { totalCount: 2 },
    };

    // auth
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    // scan search (skips app lookup since orgId provided)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [scanData], totalElements: 1 }),
    });

    const result = await checkForExistingScan({
      apiKey: 'test-key',
      organizationId: 'org-123',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toEqual(scanData);
    // Should be 2 calls: auth + scan search (no app lookup)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('auto-derives orgId from app lookup when not provided', async () => {
    const scanData = {
      scan: { id: 'scan-789', status: 'COMPLETED' },
      findings: { totalCount: 2 },
    };

    // auth
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    // app lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ applicationId: 'app-456', organizationId: 'org-derived' }),
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
    // Should be 3 calls: auth + app lookup + scan search
    expect(mockFetch).toHaveBeenCalledTimes(3);
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
    // app lookup fails
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
  });

  test('returns null when no scan matches', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [], totalElements: 0 }),
    });

    const result = await checkForExistingScan({
      apiKey: 'test-key',
      organizationId: 'org-123',
      applicationId: 'app-456',
      commitSha: 'abc1234',
    });

    expect(result).toBeNull();
  });
});
