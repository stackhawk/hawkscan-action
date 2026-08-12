import { jest, beforeEach, describe, test, expect } from '@jest/globals';

// Mock modules BEFORE any imports that use them
jest.unstable_mockModule('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  summary: {
    addRaw: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('@octokit/core', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    request: jest.fn().mockResolvedValue({ status: 201 }),
  })),
}));

const { buildScanSummaryMarkdown, postPrComment: _postPrComment, writeScanSummary } = await import('../src/scan_summary.js');
void _postPrComment; // imported for coverage; tested via integration
const core = await import('@actions/core');

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_EVENT_PATH;
});

describe('buildScanSummaryMarkdown', () => {
  // Mirrors a real ApplicationScanResult: no scanURL, version/urlCount/appHost
  // live where the API actually puts them, and severity counts come from
  // alertStats.alertStatusStats rather than a `findings` object.
  const baseScanResult = {
    scan: {
      id: 'scan-789',
      status: 'COMPLETED',
      applicationName: 'deeperapidemo',
      env: 'Development',
      version: '3.4.0',
      timestamp: '1786572899138',
    },
    scanDuration: '37',
    urlCount: 28,
    appHost: 'https://localhost:9000',
    alertStats: {
      totalAlerts: 4,
      uniqueAlerts: 4,
      alertStatusStats: [
        { alertStatus: 'UNKNOWN', totalCount: 4, severityStats: { High: 1, Medium: 2, Low: 1 } },
      ],
    },
  };

  test('includes header with app name and environment', () => {
    const md = buildScanSummaryMarkdown({ scanResult: baseScanResult, commitSha: 'abc1234' });
    expect(md).toContain('HawkScan Completed');
    expect(md).toContain('deeperapidemo');
    expect(md).toContain('Development');
  });

  test('includes findings count and severity breakdown', () => {
    const md = buildScanSummaryMarkdown({ scanResult: baseScanResult, commitSha: 'abc1234' });
    expect(md).toContain('4');
    expect(md).toMatch(/[Hh]igh.*1/);
    expect(md).toMatch(/[Mm]edium.*2/);
    expect(md).toMatch(/[Ll]ow.*1/);
  });

  test('includes link to scan results', () => {
    const md = buildScanSummaryMarkdown({ scanResult: baseScanResult, commitSha: 'abc1234' });
    expect(md).toContain('https://app.stackhawk.com/scans/scan-789');
  });

  test('includes note about pre-existing scan', () => {
    const md = buildScanSummaryMarkdown({ scanResult: baseScanResult, commitSha: 'abc1234' });
    expect(md).toContain('previously completed scan');
  });

  test('includes scan metadata', () => {
    const md = buildScanSummaryMarkdown({ scanResult: baseScanResult, commitSha: 'abc1234' });
    expect(md).toContain('3.4.0');
    expect(md).toContain('https://localhost:9000');
    expect(md).toContain('28');
  });

  test('includes failure message when threshold exceeded', () => {
    const md = buildScanSummaryMarkdown({
      scanResult: baseScanResult,
      commitSha: 'abc1234',
      thresholdExceeded: true,
      failureMessage: '5 Findings >= High Found',
    });
    expect(md).toContain('5 Findings >= High Found');
  });

  test('shows pass status when threshold not exceeded', () => {
    const scanWithNoFindings = {
      ...baseScanResult,
      alertStats: { totalAlerts: 0, uniqueAlerts: 0, alertStatusStats: [] },
    };
    const md = buildScanSummaryMarkdown({ scanResult: scanWithNoFindings, commitSha: 'abc1234' });
    expect(md).not.toContain('Failed');
  });
});

describe('writeScanSummary', () => {
  test('writes markdown to GitHub Step Summary', async () => {
    await writeScanSummary('# Test Summary');
    expect(core.summary.addRaw).toHaveBeenCalledWith('# Test Summary');
    expect(core.summary.write).toHaveBeenCalled();
  });
});
