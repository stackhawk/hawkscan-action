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

const { buildScanSummaryMarkdown, postPrComment, writeScanSummary } = await import('../src/scan_summary.js');
const core = await import('@actions/core');

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_EVENT_PATH;
});

describe('buildScanSummaryMarkdown', () => {
  const baseScanResult = {
    scan: {
      id: 'scan-789',
      status: 'COMPLETED',
      scanURL: 'https://app.stackhawk.com/scans/scan-789',
      applicationName: 'deeperapidemo',
      env: 'Development',
      startedTimestamp: '2023-10-26T16:39:00Z',
      completedTimestamp: '2023-10-26T16:46:16Z',
      scannedPaths: 28,
      hawkscanVersion: '3.4.0',
      host: 'https://localhost:9000',
    },
    findings: {
      totalCount: 4,
      highCount: 1,
      mediumCount: 2,
      lowCount: 1,
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
      findings: { totalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
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
