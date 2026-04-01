# Commit SHA Check Feature Design

## Overview

Add an opt-in "pre-check" mode to the hawkscan-action that looks up an existing StackHawk scan by commit SHA before running a new scan. When a developer runs HawkScan locally (which captures the commit SHA), and that commit later appears in a PR, the action can retrieve those results from the StackHawk platform instead of re-scanning — saving CI time and providing immediate feedback.

## Motivation

Developers running HawkScan locally already produce scan results tied to their commit SHA. Today, when that commit enters a PR, the action re-runs the scan from scratch. This feature eliminates redundant scans by reusing existing results when available, while falling back to a normal scan when no prior results exist.

## New Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `commitShaCheck` | no | `false` | Enable SHA lookup against StackHawk platform before scanning |
| `organizationId` | no | `''` | StackHawk organization ID. Required when `commitShaCheck` is `true` |

All existing inputs remain unchanged. The `apiKey` (already required) and `githubToken` (already defaulted to `github.token`) are reused. `githubToken` is effectively required when `commitShaCheck` is `true` since it's needed for posting PR comments.

## Core Flow

```
Action starts with commitShaCheck: true
  1. Validate organizationId is provided (core.setFailed if missing)
  2. Parse applicationId from stackhawk.yml config file or environment variable, environment being the override
  3. Determine commit SHA:
     - github.event.pull_request.head.sha (preferred, matches local dev commit)
     - Falls back to GITHUB_SHA
  4. Authenticate with StackHawk API (GET /api/v1/auth/login with apiKey)
  5. Search for scan: GET /api/v1/scan/{organizationId}?appIds={applicationId}&tag=GIT_SHA:{commitSha}*

  Scan found?
  ├── YES:
  │   - Extract scan results (findings, severities, scan link, metadata)
  │   - Post PR comment via Octokit (matching StackHawk bot format)
  │   - Write GitHub Step Summary (same content)
  │   - Set action outputs: scanId, resultsLink
  │   - Evaluate failureThreshold from scan data
  │     - Exceeded: core.setFailed() with details
  │     - Not exceeded: pass
  │   - EXIT (skip CLI install and scan)
  │
  └── NO:
      - core.info("No existing scan found for this commit SHA, running scan...")
      - Fall through to existing scan logic (install CLI, run HawkScan normally)
```

When `commitShaCheck` is `false` (default), the action behaves exactly as it does today.

## API Integration

### Authentication

- Endpoint: `GET /api/v1/auth/login`
- Auth: API key via header
- Returns: Bearer token for subsequent requests

### Scan Search

- Endpoint: `GET /api/v1/scan/{organizationId}?appIds={applicationId}&tag=GIT_SHA:{commitSha}*`
- Auth: Bearer token from login
- Returns: Array of scan results matching the SHA tag
- If multiple scans match, use the first result (API returns results sorted descending by date via `sortDir=desc`)

### Error Handling (Graceful Degradation)

All API failures degrade gracefully to running the normal scan:

| Failure | Behavior |
|---------|----------|
| Auth failure | `core.warning()`, fall through to normal scan |
| API timeout / network error | `core.warning()`, fall through to normal scan |
| Malformed API response | `core.warning()`, fall through to normal scan |
| Missing organizationId | `core.setFailed()` (this is a config error, not transient) |
| Missing applicationId in config | `core.setFailed()` (config error) |

## Output Format

### PR Comment

Posted via Octokit using `githubToken`. Format matches the existing StackHawk bot comment style as closely as the API data allows:

- Header: HawkScan Completed with app name and environment
- Pass/fail status with threshold info
- Findings count with severity breakdown
- Vulnerability details with category and "View in StackHawk" links
- Expandable path lists per finding (if data available)
- Scan metadata (duration, date, scanned paths, version, host)
- Note indicating results are from a previously completed scan

### GitHub Step Summary

Same content as the PR comment, written via `core.summary`.

### Action Outputs

| Output | Description |
|--------|-------------|
| `scanId` | The matched scan's ID (same as existing output) |
| `resultsLink` | Link to scan results on StackHawk (same as existing output) |

Outputs are set in both the SHA-check path and the normal scan path, so downstream workflow steps work regardless of which path was taken.

## New Files

| File | Purpose |
|------|---------|
| `src/scan_check.js` | Core SHA lookup logic: auth, API calls, response parsing, threshold evaluation |
| `src/config_parser.js` | Parse `applicationId` from stackhawk.yml |
| `src/scan_summary.js` | Format scan results as markdown for PR comment and Step Summary |
| `__tests__/scan_check.test.js` | Tests for API integration logic |
| `__tests__/config_parser.test.js` | Tests for YAML config parsing |
| `__tests__/scan_summary.test.js` | Tests for markdown output formatting |

## Modified Files

| File | Change |
|------|--------|
| `action.yml` | Add `commitShaCheck` and `organizationId` inputs |
| `src/index.js` | Add pre-check branch before existing scan logic |
| `src/utilities.js` | Add new inputs to `gatherInputs()` |

## Dependencies

- `js-yaml` — parse stackhawk.yml to extract `applicationId`
- Node 24 native `fetch` — HTTP client for StackHawk API (no new dependency)
- `@octokit/core` — already a dependency, reuse for PR comments

## Example Usage

```yaml
- uses: stackhawk/hawkscan-action@v2
  with:
    apiKey: ${{ secrets.HAWK_API_KEY }}
    commitShaCheck: 'true'
    organizationId: ${{ secrets.HAWK_ORG_ID }}
```

When triggered on a PR, this will:
1. Look up the head commit SHA against StackHawk
2. If found, post results as PR comment + Step Summary, pass/fail based on threshold
3. If not found, run HawkScan normally

## Scope Boundaries

**In scope:**
- SHA lookup and result retrieval from StackHawk API
- PR comment and Step Summary output
- Pass/fail based on threshold from scan data
- Graceful fallback to normal scan on API errors
- Config parsing for applicationId

**Out of scope:**
- Changes to how HawkScan CLI captures/sends commit SHAs (already works)
- New platform-side API endpoints (using existing search endpoint)
- SARIF upload for SHA-check results (only applies to fresh scans)
- Caching or storing results locally
