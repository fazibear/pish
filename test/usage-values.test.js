import assert from 'node:assert/strict';
import test from 'node:test';
import { formatReset, usageValues } from '../src/usage-values.js';

function values(buckets) {
  return usageValues(
    {
      status: 'ready',
      providerId: 'test',
      expiresAt: 1000,
      report: { providerId: 'test', buckets },
    },
    0,
  );
}

test('count quotas expose normalized names, minute aliases, and derived percentages', () => {
  const result = values([
    { id: 'Requests / Minute', unit: 'requests', used: 25, limit: 100, windowMinutes: 30 },
  ]);
  assert.equal(result.usage_requests___minute_percent_used, '25%');
  assert.equal(result.usage_30m_percent_left, '75%');
  assert.equal(result.usage_30m_left, '?');
});

test('percent quotas prefer explicit remaining values', () => {
  const result = values([{ id: 'quota', unit: 'percent', used: 20, remaining: 65 }]);
  assert.equal(result.usage_quota_percent_left, '65%');
});

test('invalid buckets are ignored and invalid timestamps stay unknown', () => {
  const result = values([null, {}, { id: 'quota', resetsAt: Infinity }]);
  assert.equal(result.usage_quota_reset, '?');
  assert.equal(result.usage_quota_reset_at, '?');
  assert.equal(formatReset(8640000000000001, 0), '?');
});
