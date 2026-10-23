import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usageValues, createUsageClient, formatReset } from '../src/usage.js';
test('reset displays a compact countdown', () => {
  assert.equal(formatReset(135 * 60000, 0), '2h 15m');
  assert.equal(formatReset((3 * 1440 + 240) * 60000, 0), '3d 4h');
  assert.equal(formatReset(1000, 0), '1m');
  assert.equal(formatReset(0, 1000), 'now');
  assert.equal(formatReset(undefined), '?');
});
test('structured quota exposes separate window fields without mixing buckets', () => {
  const values = usageValues({ status: 'ready', providerId: 'provider', expiresAt: 1000, report: {
    providerId: 'provider', providerName: 'Provider', buckets: [
      { id: 'primary', label: '5 hours', unit: 'percent', used: 20, remaining: 80, windowMinutes: 300 },
      { id: 'weekly', label: 'Week', unit: 'percent', used: 40, remaining: 60, windowMinutes: 10080 },
    ],
  } }, 0);
  assert.equal(values.usage_5h_percent_used, '20%');
  assert.equal(values.usage_7d_percent_left, '60%');
  assert.equal(values.usage_primary_limit, '?');
  assert.equal(values.usage_provider, 'Provider');
});
test('unavailable and expired usage stays empty', () => {
  assert.deepEqual(usageValues(undefined), {});
  assert.deepEqual(usageValues({ status: 'ready', expiresAt: 0 }), {});
});
test('refresh retains unexpired quota while pending and after transient failure', async () => {
  const ready = {
    status: 'ready', providerId: 'provider', expiresAt: Date.now() + 60000,
    report: { providerId: 'provider', providerName: 'Provider', buckets: [] },
  };
  let offer = ready;
  const client = createUsageClient({ events: { emit(_name, request) { request.respond(offer); } } }, () => {});
  const ctx = { model: { provider: 'provider' }, sessionManager: { getSessionId: () => 'session' } };
  client.start(ctx);
  try {
    await client.refresh();
    assert.equal(client.values().usage_provider, 'Provider');
    let settle;
    offer = new Promise(resolve => { settle = resolve; });
    const pending = client.refresh();
    assert.equal(client.values().usage_provider, 'Provider');
    settle({ status: 'unavailable', providerId: 'provider', reason: 'query-failed' });
    await pending;
    assert.equal(client.values().usage_provider, 'Provider');
    // Superseding an in-flight request must not clear the last valid report.
    offer = new Promise(() => {});
    const obsolete = client.refresh();
    offer = ready;
    await client.refresh();
    await obsolete;
    assert.equal(client.values().usage_provider, 'Provider');
    ready.expiresAt = Date.now() - 1;
    assert.deepEqual(client.values(), {});
  } finally { client.stop(); }
});
test('absent service is safe and lifecycle stops polling', async () => {
  const client = createUsageClient({ events: { emit() {} } }, () => {});
  const ctx = { model: { provider: 'provider' }, sessionManager: { getSessionId: () => 'session' } };
  client.start(ctx);
  await client.refresh();
  assert.deepEqual(client.values(), {});
  client.stop();
});
