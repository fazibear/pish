const MAX_TIMESTAMP = 8640000000000000;
const isTimestamp = (value) => Number.isFinite(value) && Math.abs(value) <= MAX_TIMESTAMP;
const formatNumber = (value) =>
  Number.isFinite(value) ? String(Math.round(value * 10) / 10) : '?';
const formatPercent = (value) => (Number.isFinite(value) ? `${formatNumber(value)}%` : '?');

export function formatReset(timestamp, now = Date.now()) {
  if (!isTimestamp(timestamp)) return '?';
  const minutes = Math.ceil(Math.max(0, timestamp - now) / 60000);
  if (!minutes) return 'now';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  if (days) return `${days}d${hours ? ` ${hours}h` : ''}`;
  if (hours) return `${hours}h${mins ? ` ${mins}m` : ''}`;
  return `${mins}m`;
}

function windowKey(minutes) {
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function bucketFields(bucket, now) {
  // Percent fields are only meaningful for percent quotas or known limits.
  let percentUsed;
  if (bucket.unit === 'percent') {
    percentUsed = bucket.used;
  } else if (Number.isFinite(bucket.limit) && bucket.limit > 0 && Number.isFinite(bucket.used)) {
    percentUsed = (bucket.used / bucket.limit) * 100;
  }
  let percentLeft;
  if (bucket.unit === 'percent' && Number.isFinite(bucket.remaining)) {
    percentLeft = bucket.remaining;
  } else if (Number.isFinite(percentUsed)) {
    percentLeft = Math.max(0, 100 - percentUsed);
  }
  return {
    label: bucket.label ?? bucket.id,
    used: formatNumber(bucket.used),
    left: formatNumber(bucket.remaining),
    limit: formatNumber(bucket.limit),
    unit: bucket.unit ?? '',
    percent_used: formatPercent(percentUsed),
    percent_left: formatPercent(percentLeft),
    reset: formatReset(bucket.resetsAt, now),
    reset_at: isTimestamp(bucket.resetsAt) ? new Date(bucket.resetsAt).toISOString() : '?',
  };
}

export function usageValues(result, now = Date.now()) {
  if (result?.status !== 'ready' || !Number.isFinite(result.expiresAt) || result.expiresAt <= now)
    return {};
  const report = result.report;
  if (!report || report.providerId !== result.providerId || !Array.isArray(report.buckets))
    return {};
  const values = { usage_provider: report.providerName ?? report.providerId };
  for (const bucket of report.buckets) {
    if (!bucket || typeof bucket.id !== 'string') continue;
    const keys = new Set([bucket.id.toLowerCase().replace(/[^a-z0-9_]/g, '_')]);
    if (Number.isFinite(bucket.windowMinutes) && bucket.windowMinutes > 0) {
      keys.add(windowKey(bucket.windowMinutes));
    }
    const fields = bucketFields(bucket, now);
    for (const key of keys) {
      for (const [field, value] of Object.entries(fields)) {
        values[`usage_${key}_${field}`] = value;
      }
    }
  }
  return values;
}
