import fs from 'fs';
import * as core from '@actions/core';
import { Octokit } from '@octokit/core';
import { summarizeFindings } from './findings.js';

export function buildScanSummaryMarkdown({ scanResult, commitSha, thresholdExceeded = false, failureMessage = '' }) {
  const { scan } = scanResult;
  const findings = summarizeFindings(scanResult);
  const appName = scan.applicationName || 'Unknown App';
  const env = scan.env || 'Unknown';
  // The API returns no scan URL; the platform builds it from the scan id.
  const scanUrl = `https://app.stackhawk.com/scans/${scan.id}`;

  const statusLine = thresholdExceeded
    ? `**Check Failed:** "${failureMessage}"`
    : '**Check Passed**';

  const statusIcon = thresholdExceeded ? 'X' : '\u2705';

  const lines = [
    `## HawkScan Completed`,
    ``,
    `**${appName}** | ${env}`,
    ``,
    `${statusIcon} ${statusLine}`,
    ``,
    `### Findings: ${findings.total}`,
    ``,
    `| Severity | Count |`,
    `|----------|-------|`,
    `| High | ${findings.high} |`,
    `| Medium | ${findings.medium} |`,
    `| Low | ${findings.low} |`,
    ``,
    `**[View Full Results on StackHawk](${scanUrl})**`,
    ``,
    `### Scan Metadata`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Commit | \`${commitSha}\` |`,
    `| URLs Scanned | ${scanResult.urlCount ?? 'N/A'} |`,
    `| HawkScan Version | ${scan.version || 'N/A'} |`,
    `| Host | ${scanResult.appHost || 'N/A'} |`,
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
