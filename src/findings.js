// Finding counts and failure-threshold evaluation for a scan result returned by
// GET /api/v1/scan/{orgId}.
//
// The API reports counts per triage status (Nest application.proto AlertStatusStats),
// not a single flat total, and it carries no "did this exceed the threshold" flag --
// that decision belongs to the scan's own hawk.failureThreshold config, so we
// reproduce it here for a scan we are reusing rather than re-running.

// Findings triaged into these statuses are deliberately not counted against the
// threshold: they represent risk a human already reviewed and dismissed.
const IGNORED_STATUSES = new Set(['FALSE_POSITIVE', 'RISK_ACCEPTED']);

// Severities a given threshold fails on, lowest threshold being the strictest.
const THRESHOLD_SEVERITIES = {
  high: ['high'],
  medium: ['high', 'medium'],
  low: ['high', 'medium', 'low'],
};

export function summarizeFindings(scanResult) {
  const counts = { total: 0, high: 0, medium: 0, low: 0 };
  const statusStats = scanResult?.alertStats?.alertStatusStats;

  if (!Array.isArray(statusStats)) {
    return counts;
  }

  for (const stat of statusStats) {
    if (IGNORED_STATUSES.has(stat?.alertStatus)) {
      continue;
    }

    for (const [severity, count] of Object.entries(stat?.severityStats || {})) {
      const key = severity.toLowerCase();
      if (key in counts && key !== 'total') {
        counts[key] += count;
        counts.total += count;
      }
    }
  }

  return counts;
}

export function exceedsThreshold(counts, failureThreshold) {
  if (!failureThreshold) {
    return false;
  }

  const severities = THRESHOLD_SEVERITIES[String(failureThreshold).toLowerCase()];
  if (!severities) {
    return false;
  }

  return severities.some((severity) => counts[severity] > 0);
}
