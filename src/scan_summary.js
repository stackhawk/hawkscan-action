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

  const statusIcon = thresholdExceeded ? 'X' : '\u2705';

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
