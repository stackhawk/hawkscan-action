# Commit SHA Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in pre-check that looks up existing StackHawk scan results by commit SHA before running a new scan, posting results as PR comment and Step Summary.

**Architecture:** New modules (`scan_check.js`, `config_parser.js`, `scan_summary.js`) handle API auth, scan lookup, and output formatting. `index.js` gets a pre-check branch that runs before existing scan logic when `commitShaCheck: true`. Graceful degradation on any API error falls through to the normal scan path.

**Tech Stack:** Node 24 native `fetch`, `@actions/core` (summary API), `@octokit/core` (PR comments), `js-yaml` (config parsing), Jest for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/config_parser.js` | Create | Parse `applicationId` from stackhawk.yml |
| `src/scan_check.js` | Create | StackHawk API auth, scan lookup by SHA tag, threshold evaluation |
| `src/scan_summary.js` | Create | Format scan results as markdown for PR comment and Step Summary |
| `src/utilities.js` | Modify | Add new inputs to `gatherInputs()` |
| `src/index.js` | Modify | Add pre-check branch before existing scan logic |
| `action.yml` | Modify | Add `commitShaCheck` and `organizationId` inputs |
| `__tests__/config_parser.test.js` | Create | Tests for YAML config parsing |
| `__tests__/scan_check.test.js` | Create | Tests for API integration logic |
| `__tests__/scan_summary.test.js` | Create | Tests for markdown output formatting |
| `__tests__/index.js` | Modify | Update existing tests for new inputs, add integration test for pre-check branch |
| `package.json` | Modify | Add `js-yaml` dependency |

---

### Task 1: Add `js-yaml` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install js-yaml**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm install js-yaml
```

- [ ] **Step 2: Verify install**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && node -e "import('js-yaml').then(y => console.log('js-yaml loaded'))"
```

Expected: `js-yaml loaded`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add js-yaml dependency for config parsing"
```

---

### Task 2: Config Parser — Parse `applicationId` from stackhawk.yml

**Files:**
- Create: `src/config_parser.js`
- Create: `__tests__/config_parser.test.js`

- [ ] **Step 1: Write the failing test**

Create `__tests__/config_parser.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=config_parser
```

Expected: FAIL — `parseApplicationId` not found.

- [ ] **Step 3: Write implementation**

Create `src/config_parser.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=config_parser
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config_parser.js __tests__/config_parser.test.js
git commit -m "feat: add config parser to extract applicationId from stackhawk.yml"
```

---

### Task 3: Scan Check — StackHawk API auth and scan lookup

**Files:**
- Create: `src/scan_check.js`
- Create: `__tests__/scan_check.test.js`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/scan_check.test.js`:

```javascript
import { authenticate, searchScanBySha, checkForExistingScan } from '../src/scan_check.js';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock @actions/core
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

const core = await import('@actions/core');

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

describe('checkForExistingScan', () => {
  test('returns scan result when found', async () => {
    const scanData = {
      scan: { id: 'scan-789', status: 'COMPLETED' },
      findings: { totalCount: 2 },
    };

    // Mock authenticate
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    });
    // Mock searchScanBySha
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
  });

  test('returns null when auth fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await checkForExistingScan({
      apiKey: 'bad-key',
      organizationId: 'org-123',
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=scan_check
```

Expected: FAIL — `scan_check.js` module not found.

- [ ] **Step 3: Write implementation**

Create `src/scan_check.js`:

```javascript
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

export async function checkForExistingScan({ apiKey, organizationId, applicationId, commitSha }) {
  const token = await authenticate(apiKey);
  if (!token) {
    return null;
  }

  return searchScanBySha({ token, organizationId, applicationId, commitSha });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=scan_check
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scan_check.js __tests__/scan_check.test.js
git commit -m "feat: add scan check module for SHA lookup via StackHawk API"
```

---

### Task 4: Scan Summary — Markdown formatting for PR comment and Step Summary

**Files:**
- Create: `src/scan_summary.js`
- Create: `__tests__/scan_summary.test.js`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/scan_summary.test.js`:

```javascript
import { buildScanSummaryMarkdown, postPrComment, writeScanSummary } from '../src/scan_summary.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=scan_summary
```

Expected: FAIL — `scan_summary.js` module not found.

- [ ] **Step 3: Write implementation**

Create `src/scan_summary.js`:

```javascript
import * as core from '@actions/core';
import { Octokit } from '@octokit/core';

export function buildScanSummaryMarkdown({ scanResult, commitSha, thresholdExceeded = false, failureMessage = '' }) {
  const { scan, findings } = scanResult;
  const appName = scan.applicationName || 'Unknown App';
  const env = scan.env || 'Unknown';
  const scanUrl = scan.scanURL || `https://app.stackhawk.com/scans/${scan.id}`;

  const statusLine = thresholdExceeded
    ? `**Check Failed:** "${failureMessage}"`
    : '**Check Passed**';

  const statusIcon = thresholdExceeded ? 'X' : '\\u2705';

  const lines = [
    `## HawkScan Completed`,
    ``,
    `**${appName}** | ${env}`,
    ``,
    `${statusIcon} ${statusLine}`,
    ``,
    `### Findings: ${findings.totalCount}`,
    ``,
    `| Severity | Count |`,
    `|----------|-------|`,
    `| High | ${findings.highCount || 0} |`,
    `| Medium | ${findings.mediumCount || 0} |`,
    `| Low | ${findings.lowCount || 0} |`,
    ``,
    `**[View Full Results on StackHawk](${scanUrl})**`,
    ``,
    `### Scan Metadata`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Commit | \`${commitSha}\` |`,
    `| Scanned Paths | ${scan.scannedPaths || 'N/A'} |`,
    `| HawkScan Version | ${scan.hawkscanVersion || 'N/A'} |`,
    `| Host | ${scan.host || 'N/A'} |`,
    ``,
    `> *Results from a previously completed scan. No new scan was run.*`,
  ];

  return lines.join('\n');
}

export async function writeScanSummary(markdown) {
  await core.summary.addRaw(markdown).write();
}

export async function postPrComment({ githubToken, markdown }) {
  const octokit = new Octokit({ auth: githubToken });

  const githubRepository = process.env['GITHUB_REPOSITORY'];
  if (!githubRepository) {
    core.warning('GITHUB_REPOSITORY not set, skipping PR comment');
    return;
  }

  const [owner, repo] = githubRepository.split('/');

  const prNumber = getPrNumber();
  if (!prNumber) {
    core.debug('Could not determine PR number, skipping PR comment');
    return;
  }

  try {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: prNumber,
      body: markdown,
    });
    core.info('Posted scan results as PR comment');
  } catch (error) {
    core.warning(`Failed to post PR comment: ${error.message}`);
  }
}

function getPrNumber() {
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  if (!eventPath) {
    return null;
  }

  try {
    const fs = await import('fs');
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.number || event?.number || null;
  } catch {
    return null;
  }
}
```

**Note:** The `getPrNumber` function has a bug — it uses top-level `await` inside a non-async function. Fix in Step 3 implementation:

Replace `getPrNumber` with:

```javascript
import fs from 'fs';

function getPrNumber() {
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  if (!eventPath) {
    return null;
  }

  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.number || event?.number || null;
  } catch {
    return null;
  }
}
```

The full corrected `src/scan_summary.js`:

```javascript
import fs from 'fs';
import * as core from '@actions/core';
import { Octokit } from '@octokit/core';

export function buildScanSummaryMarkdown({ scanResult, commitSha, thresholdExceeded = false, failureMessage = '' }) {
  const { scan, findings } = scanResult;
  const appName = scan.applicationName || 'Unknown App';
  const env = scan.env || 'Unknown';
  const scanUrl = scan.scanURL || `https://app.stackhawk.com/scans/${scan.id}`;

  const statusLine = thresholdExceeded
    ? `**Check Failed:** "${failureMessage}"`
    : '**Check Passed**';

  const statusIcon = thresholdExceeded ? 'X' : '\\u2705';

  const lines = [
    `## HawkScan Completed`,
    ``,
    `**${appName}** | ${env}`,
    ``,
    `${statusIcon} ${statusLine}`,
    ``,
    `### Findings: ${findings.totalCount}`,
    ``,
    `| Severity | Count |`,
    `|----------|-------|`,
    `| High | ${findings.highCount || 0} |`,
    `| Medium | ${findings.mediumCount || 0} |`,
    `| Low | ${findings.lowCount || 0} |`,
    ``,
    `**[View Full Results on StackHawk](${scanUrl})**`,
    ``,
    `### Scan Metadata`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Commit | \`${commitSha}\` |`,
    `| Scanned Paths | ${scan.scannedPaths || 'N/A'} |`,
    `| HawkScan Version | ${scan.hawkscanVersion || 'N/A'} |`,
    `| Host | ${scan.host || 'N/A'} |`,
    ``,
    `> *Results from a previously completed scan. No new scan was run.*`,
  ];

  return lines.join('\n');
}

export async function writeScanSummary(markdown) {
  await core.summary.addRaw(markdown).write();
}

export async function postPrComment({ githubToken, markdown }) {
  const octokit = new Octokit({ auth: githubToken });

  const githubRepository = process.env['GITHUB_REPOSITORY'];
  if (!githubRepository) {
    core.warning('GITHUB_REPOSITORY not set, skipping PR comment');
    return;
  }

  const [owner, repo] = githubRepository.split('/');

  const prNumber = getPrNumber();
  if (!prNumber) {
    core.debug('Could not determine PR number, skipping PR comment');
    return;
  }

  try {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: prNumber,
      body: markdown,
    });
    core.info('Posted scan results as PR comment');
  } catch (error) {
    core.warning(`Failed to post PR comment: ${error.message}`);
  }
}

function getPrNumber() {
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  if (!eventPath) {
    return null;
  }

  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.number || event?.number || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=scan_summary
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scan_summary.js __tests__/scan_summary.test.js
git commit -m "feat: add scan summary module for PR comment and Step Summary output"
```

---

### Task 5: Update action.yml and gatherInputs with new inputs

**Files:**
- Modify: `action.yml`
- Modify: `src/utilities.js`
- Modify: `__tests__/index.js`

- [ ] **Step 1: Write the failing test — update existing input tests**

Add to `__tests__/index.js` in the `beforeEach` block, after the existing `delete` statements:

```javascript
  delete process.env.INPUT_COMMITSHACHECK;
  delete process.env.INPUT_ORGANIZATIONID;
```

Update the `'gather minimal inputs'` test expected result to include:

```javascript
    commitShaCheck: 'false',
    organizationId: '',
```

Update the `'gather max inputs'` test to add these to the `buildInput` call:

```javascript
    commitShaCheck: 'true',
    organizationId: 'org-uuid-here',
```

And to the expected result:

```javascript
    commitShaCheck: 'true',
    organizationId: 'org-uuid-here',
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=__tests__/index
```

Expected: FAIL — `commitShaCheck` and `organizationId` not in output.

- [ ] **Step 3: Update action.yml**

Add after the `codeScanningAlerts` input block in `action.yml`:

```yaml
  commitShaCheck:
    description: If `true`, check the StackHawk platform for existing scan results matching the commit SHA before running a new scan
    required: false
    default: false
  organizationId:
    description: StackHawk organization ID. Required when `commitShaCheck` is enabled
    required: false
    default: ''
```

- [ ] **Step 4: Update gatherInputs in src/utilities.js**

Add these two lines inside the return object in `gatherInputs()`, after the `installCLIOnly` line:

```javascript
    commitShaCheck: core.getInput('commitShaCheck').toLowerCase() || 'false',
    organizationId: core.getInput('organizationId') || '',
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=__tests__/index
```

Expected: All existing tests PASS with updated expectations.

- [ ] **Step 6: Commit**

```bash
git add action.yml src/utilities.js __tests__/index.js
git commit -m "feat: add commitShaCheck and organizationId inputs"
```

---

### Task 6: Wire up the pre-check branch in index.js

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Write a failing integration test**

Add to `__tests__/index.js`:

```javascript
import { parseApplicationId } from '../src/config_parser.js';
import { checkForExistingScan } from '../src/scan_check.js';

// These are tested in their own test files; here we just verify the module exports
test('config_parser exports parseApplicationId', () => {
  expect(typeof parseApplicationId).toBe('function');
});

test('scan_check exports checkForExistingScan', () => {
  expect(typeof checkForExistingScan).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it passes** (these are smoke tests for imports)

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test -- --testPathPattern=__tests__/index
```

Expected: PASS.

- [ ] **Step 3: Update src/index.js with pre-check branch**

Replace the contents of `src/index.js` with:

```javascript
import * as core from '@actions/core';
import * as utilities from './utilities.js';
import * as sarif from './sarif.js';
import { setup } from './setup.js';
import { addSignalHandler } from './signal_handler.js';
import { parseApplicationId } from './config_parser.js';
import { checkForExistingScan } from './scan_check.js';
import { buildScanSummaryMarkdown, writeScanSummary, postPrComment } from './scan_summary.js';

async function runShaCheck(inputs) {
  if (inputs.commitShaCheck !== 'true') {
    return false;
  }

  core.info('Commit SHA check enabled, looking for existing scan results...');

  if (!inputs.organizationId) {
    core.setFailed('organizationId is required when commitShaCheck is enabled');
    return true;
  }

  const applicationId = parseApplicationId(inputs.workspace, inputs.configurationFiles);
  if (!applicationId) {
    core.setFailed('Could not find applicationId in stackhawk configuration files');
    return true;
  }

  const commitSha = process.env['GITHUB_EVENT_PATH']
    ? getHeadSha()
    : process.env['GITHUB_SHA'];

  if (!commitSha) {
    core.warning('Could not determine commit SHA, falling back to normal scan');
    return false;
  }

  core.info(`Searching for existing scan for commit: ${commitSha}`);

  const scanResult = await checkForExistingScan({
    apiKey: inputs.apiKey,
    organizationId: inputs.organizationId,
    applicationId,
    commitSha,
  });

  if (!scanResult) {
    core.info('No existing scan found for this commit SHA, running scan...');
    return false;
  }

  const scanId = scanResult.scan?.id || 'unknown';
  const scanUrl = scanResult.scan?.scanURL || `https://app.stackhawk.com/scans/${scanId}`;
  const thresholdExceeded = scanResult.scan?.status === 'FAILED' ||
    (scanResult.findings?.totalCount > 0 && scanResult.scan?.failureThresholdExceeded);

  core.setOutput('scanId', scanId);
  core.setOutput('resultsLink', scanUrl);

  const markdown = buildScanSummaryMarkdown({
    scanResult,
    commitSha,
    thresholdExceeded,
    failureMessage: thresholdExceeded ? `Findings exceed failure threshold` : '',
  });

  await writeScanSummary(markdown);
  await postPrComment({ githubToken: inputs.githubToken, markdown });

  if (thresholdExceeded) {
    core.setFailed(`Existing scan ${scanId} has findings that exceed the failure threshold. See: ${scanUrl}`);
  }

  return true;
}

function getHeadSha() {
  try {
    const fs = await import('fs');
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    if (!eventPath) return process.env['GITHUB_SHA'] || null;
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.head?.sha || process.env['GITHUB_SHA'] || null;
  } catch {
    return process.env['GITHUB_SHA'] || null;
  }
}
```

**Note:** The `getHeadSha` function has the same `await import` in non-async issue. Corrected version uses top-level `fs` import. Full corrected `src/index.js`:

```javascript
import fs from 'fs';
import * as core from '@actions/core';
import * as utilities from './utilities.js';
import * as sarif from './sarif.js';
import { setup } from './setup.js';
import { addSignalHandler } from './signal_handler.js';
import { parseApplicationId } from './config_parser.js';
import { checkForExistingScan } from './scan_check.js';
import { buildScanSummaryMarkdown, writeScanSummary, postPrComment } from './scan_summary.js';

function getHeadSha() {
  try {
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    if (!eventPath) return process.env['GITHUB_SHA'] || null;
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    return event?.pull_request?.head?.sha || process.env['GITHUB_SHA'] || null;
  } catch {
    return process.env['GITHUB_SHA'] || null;
  }
}

async function runShaCheck(inputs) {
  if (inputs.commitShaCheck !== 'true') {
    return false;
  }

  core.info('Commit SHA check enabled, looking for existing scan results...');

  if (!inputs.organizationId) {
    core.setFailed('organizationId is required when commitShaCheck is enabled');
    return true;
  }

  const applicationId = parseApplicationId(inputs.workspace, inputs.configurationFiles);
  if (!applicationId) {
    core.setFailed('Could not find applicationId in stackhawk configuration files');
    return true;
  }

  const commitSha = getHeadSha();
  if (!commitSha) {
    core.warning('Could not determine commit SHA, falling back to normal scan');
    return false;
  }

  core.info(`Searching for existing scan for commit: ${commitSha}`);

  const scanResult = await checkForExistingScan({
    apiKey: inputs.apiKey,
    organizationId: inputs.organizationId,
    applicationId,
    commitSha,
  });

  if (!scanResult) {
    core.info('No existing scan found for this commit SHA, running scan...');
    return false;
  }

  const scanId = scanResult.scan?.id || 'unknown';
  const scanUrl = scanResult.scan?.scanURL || `https://app.stackhawk.com/scans/${scanId}`;
  const thresholdExceeded = scanResult.scan?.status === 'FAILED' ||
    (scanResult.findings?.totalCount > 0 && scanResult.scan?.failureThresholdExceeded);

  core.setOutput('scanId', scanId);
  core.setOutput('resultsLink', scanUrl);

  const markdown = buildScanSummaryMarkdown({
    scanResult,
    commitSha,
    thresholdExceeded,
    failureMessage: thresholdExceeded ? `Findings exceed failure threshold` : '',
  });

  await writeScanSummary(markdown);
  await postPrComment({ githubToken: inputs.githubToken, markdown });

  if (thresholdExceeded) {
    core.setFailed(`Existing scan ${scanId} has findings that exceed the failure threshold. See: ${scanUrl}`);
  }

  return true;
}

async function run() {
  core.info('Starting HawkScan Action');
  const inputs = utilities.gatherInputs();

  // Pre-check: look up existing scan by commit SHA
  const shaCheckHandled = await runShaCheck(inputs);
  if (shaCheckHandled) {
    return;
  }

  // Existing scan logic
  const cliCommand = utilities.buildCLICommand(inputs);
  let exitCode = 0;
  let scanData;

  if (inputs.dryRun !== 'true') {
    addSignalHandler();
    const hawkPath = await setup();
    if (inputs.installCLIOnly !== 'true') {
      scanData = await utilities.runCommand(hawkPath, cliCommand);
      exitCode = scanData.exitCode;
      core.debug(`Scanner exit code: ${scanData.exitCode} (${typeof scanData.exitCode})`);
      core.debug(`Link to scan results: ${scanData.resultsLink} (${typeof scanData.resultsLink})`);
      core.debug(`This is the scan id: ${scanData.scanId} (${typeof scanData.scanId})`);
      core.setOutput("scanId", scanData.scanId);
      if (exitCode !== 0) {
        core.setFailed(scanData.errorMessage)
      }
    }
  }

  if (scanData && inputs.codeScanningAlerts === 'true') {
    if (exitCode === 0 || exitCode === 42) {
      await sarif.uploadSarif(scanData, inputs.githubToken);
    } else {
      core.error(`Skipping SARIF upload due to scan error.`)
    }
  }

  process.exitCode = exitCode;
}

run();
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Build dist/**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm run all
```

Expected: Lint passes, dist/ rebuilds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/index.js dist/
git commit -m "feat: wire up commit SHA pre-check in main action flow"
```

---

### Important Note: API Response Shape

The threshold evaluation logic in Task 6 (`scanResult.scan?.failureThresholdExceeded`) assumes a specific API response field. Before implementing, verify the actual response shape from `GET /api/v1/scan/{orgId}?appIds=...&tag=GIT_SHA:...` and adjust the threshold check accordingly. The scan search endpoint may return different fields than assumed here — the implementation should adapt to the real response.

---

### Task 7: End-to-end validation and final build

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run full build and test suite**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && npm run all
```

Expected: `npm run all` (lint + build + test) passes cleanly.

- [ ] **Step 2: Verify dist/ is up to date**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && git diff --stat dist/
```

Expected: No changes (dist/ was rebuilt in Task 6).

- [ ] **Step 3: Review action.yml has both new inputs**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && grep -A2 'commitShaCheck\|organizationId' action.yml
```

Expected: Both inputs visible with descriptions and defaults.

- [ ] **Step 4: Verify new modules are included in dist/index.js**

```bash
cd /Users/scottgerlach/projects/hawkscan-action && grep -l 'commitShaCheck\|parseApplicationId\|checkForExistingScan\|buildScanSummaryMarkdown' dist/index.js
```

Expected: `dist/index.js` contains all new function references.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: final cleanup for commit SHA check feature"
```
