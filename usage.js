// Read-only pi-usage v1 client. No dependency on the other extension's internals.
export function formatReset(timestamp, now = Date.now()) {
  if (!Number.isFinite(timestamp) || Math.abs(timestamp) > 8640000000000000) return '?';
  const minutes = Math.ceil(Math.max(0, timestamp - now) / 60000);
  if (!minutes) return 'now';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  if (days) return `${days}d${hours ? ` ${hours}h` : ''}`;
  if (hours) return `${hours}h${mins ? ` ${mins}m` : ''}`;
  return `${mins}m`;
}

export function usageValues(result, now = Date.now()) {
  if (result?.status !== 'ready' || !Number.isFinite(result.expiresAt) || result.expiresAt <= now) return {};
  const report = result.report;
  if (!report || report.providerId !== result.providerId || !Array.isArray(report.buckets)) return {};
  const values = { usage_provider: report.providerName ?? report.providerId };
  const number = value => Number.isFinite(value) ? String(Math.round(value * 10) / 10) : '?';
  for (const bucket of report.buckets) {
    if (!bucket || typeof bucket.id !== 'string') continue;
    const keys = [bucket.id.toLowerCase().replace(/[^a-z0-9_]/g, '_')];
    if (Number.isFinite(bucket.windowMinutes) && bucket.windowMinutes > 0) {
      const minutes = bucket.windowMinutes;
      keys.push(minutes % 1440 === 0 ? `${minutes / 1440}d` : minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`);
    }
    // Percent fields are only meaningful for percent quotas or known limits.
    const percentUsed = bucket.unit === 'percent' ? bucket.used : Number.isFinite(bucket.limit) && bucket.limit > 0 && Number.isFinite(bucket.used) ? bucket.used / bucket.limit * 100 : undefined;
    const percentLeft = bucket.unit === 'percent' && Number.isFinite(bucket.remaining) ? bucket.remaining : Number.isFinite(percentUsed) ? Math.max(0, 100 - percentUsed) : undefined;
    for (const key of new Set(keys)) {
      const prefix = `usage_${key}_`;
      Object.assign(values, {
        [prefix + 'label']: bucket.label ?? bucket.id,
        [prefix + 'used']: number(bucket.used),
        [prefix + 'left']: number(bucket.remaining),
        [prefix + 'limit']: number(bucket.limit),
        [prefix + 'unit']: bucket.unit ?? '',
        [prefix + 'percent_used']: Number.isFinite(percentUsed) ? number(percentUsed) + '%' : '?',
        [prefix + 'percent_left']: Number.isFinite(percentLeft) ? number(percentLeft) + '%' : '?',
        [prefix + 'reset']: formatReset(bucket.resetsAt, now),
        [prefix + 'reset_at']: Number.isFinite(bucket.resetsAt) && Math.abs(bucket.resetsAt) <= 8640000000000000 ? new Date(bucket.resetsAt).toISOString() : '?',
      });
    }
  }
  return values;
}

export function createUsageClient(pi, onChange) {
  let controller, timer, poll, result, context, generation = 0;
  function cancel() {
    generation++;
    controller?.abort(); controller = undefined;
    clearTimeout(timer); clearInterval(poll);
    result = undefined;
  }
  async function refresh() {
    controller?.abort(); clearTimeout(timer);
    result = undefined; onChange();
    const ctx = context;
    if (!ctx?.model) return;
    const current = ++generation;
    const session = ctx.sessionManager;
    const sessionId = session.getSessionId();
    const providerId = ctx.model.provider;
    const abort = new AbortController(); controller = abort;
    let open = true, offered = false;
    await new Promise(resolve => {
      let done = false;
      const finish = value => {
        if (done) return;
        done = true; clearTimeout(timer);
        abort.signal.removeEventListener('abort', cancelled);
        if (current === generation && session.getSessionId() === sessionId && ctx.model?.provider === providerId) {
          result = value?.providerId === providerId ? value : undefined;
          onChange();
        }
        resolve();
      };
      const cancelled = () => finish(undefined);
      abort.signal.addEventListener('abort', cancelled, { once: true });
      timer = setTimeout(() => abort.abort(), 15000);
      try {
        pi.events.emit('usage:query:v1', {
          session, sessionId, providerId, refresh: true, signal: abort.signal,
          respond(value) {
            const accepted = open && !offered && !done;
            if (accepted) offered = true;
            void Promise.resolve(value).then(value => { if (accepted) finish(value); }, () => { if (accepted) finish(undefined); });
            return accepted;
          },
        });
      } catch { finish(undefined); }
      finally { open = false; }
      if (!offered) finish(undefined);
    });
  }
  return {
    start(ctx) {
      cancel(); context = ctx;
      // Defer so all extensions finish their session_start initialization.
      timer = setTimeout(() => { void refresh(); }, 0);
      poll = setInterval(() => { void refresh(); }, 60000);
    },
    values() { return usageValues(result); },
    refresh,
    stop() { cancel(); context = undefined; },
  };
}
