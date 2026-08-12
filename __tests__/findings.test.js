import { describe, test, expect } from '@jest/globals';
import { summarizeFindings, exceedsThreshold } from '../src/findings.js';

// Shapes below mirror a real GET /api/v1/scan/{orgId} result: severity counts live
// in alertStats.alertStatusStats[].severityStats, keyed by triage status
// (Nest application.proto AlertStatusStats / AlertStatus).
describe('summarizeFindings', () => {
  test('sums severities across triage statuses', () => {
    const scanResult = {
      alertStats: {
        totalAlerts: 6,
        alertStatusStats: [
          { alertStatus: 'UNKNOWN', totalCount: 4, severityStats: { High: 1, Medium: 2, Low: 1 } },
          { alertStatus: 'PROMOTED', totalCount: 2, severityStats: { High: 1, Low: 1 } },
        ],
      },
    };

    expect(summarizeFindings(scanResult)).toEqual({ total: 6, high: 2, medium: 2, low: 2 });
  });

  test('excludes findings triaged as false positive or accepted risk', () => {
    const scanResult = {
      alertStats: {
        totalAlerts: 5,
        alertStatusStats: [
          { alertStatus: 'UNKNOWN', totalCount: 1, severityStats: { High: 1 } },
          { alertStatus: 'FALSE_POSITIVE', totalCount: 2, severityStats: { High: 2 } },
          { alertStatus: 'RISK_ACCEPTED', totalCount: 2, severityStats: { Medium: 2 } },
        ],
      },
    };

    expect(summarizeFindings(scanResult)).toEqual({ total: 1, high: 1, medium: 0, low: 0 });
  });

  test('handles a scan with no findings', () => {
    expect(summarizeFindings({ alertStats: { totalAlerts: 0 } })).toEqual({
      total: 0, high: 0, medium: 0, low: 0,
    });
  });

  test('handles a result with no alertStats at all', () => {
    expect(summarizeFindings({})).toEqual({ total: 0, high: 0, medium: 0, low: 0 });
  });
});

describe('exceedsThreshold', () => {
  const counts = { total: 3, high: 0, medium: 1, low: 2 };

  test('high threshold ignores medium and low', () => {
    expect(exceedsThreshold(counts, 'high')).toBe(false);
  });

  test('medium threshold counts high and medium', () => {
    expect(exceedsThreshold(counts, 'medium')).toBe(true);
  });

  test('low threshold counts everything', () => {
    expect(exceedsThreshold({ total: 1, high: 0, medium: 0, low: 1 }, 'low')).toBe(true);
  });

  test('is case insensitive, matching the config schema', () => {
    expect(exceedsThreshold(counts, 'MEDIUM')).toBe(true);
  });

  test('never fails when no threshold is configured', () => {
    expect(exceedsThreshold(counts, null)).toBe(false);
    expect(exceedsThreshold(counts, undefined)).toBe(false);
  });

  test('never fails on an unrecognized threshold', () => {
    expect(exceedsThreshold(counts, 'critical')).toBe(false);
  });

  test('passes a clean scan at every threshold', () => {
    const clean = { total: 0, high: 0, medium: 0, low: 0 };
    for (const level of ['high', 'medium', 'low']) {
      expect(exceedsThreshold(clean, level)).toBe(false);
    }
  });
});
