import { usageValues } from './usage-values.js';

export { formatReset, usageValues } from './usage-values.js';

// Read-only pi-usage v1 client. No dependency on the other extension's internals.

export function createUsageClient(pi, onChange) {
  let controller;
  let timer;
  let poll;
  let result;
  let context;
  let generation = 0;
  let lastOutcome = { status: 'unavailable', reason: 'not-started' };
  function cancel() {
    generation++;
    controller?.abort();
    controller = undefined;
    clearTimeout(timer);
    clearInterval(poll);
    result = undefined;
  }
  async function refresh() {
    // Invalidate the old request before aborting it, so cancellation cannot
    // erase a still-valid report while its replacement is being fetched.
    const current = ++generation;
    controller?.abort();
    clearTimeout(timer);
    const ctx = context;
    if (!ctx?.model) return;
    const session = ctx.sessionManager;
    const sessionId = session.getSessionId();
    const providerId = ctx.model.provider;
    const abort = new AbortController();
    controller = abort;
    let open = true;
    let offered = false;
    await new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        abort.signal.removeEventListener('abort', cancelled);
        if (
          current === generation &&
          session.getSessionId() === sessionId &&
          ctx.model?.provider === providerId
        ) {
          lastOutcome = value ?? { status: 'unavailable', reason: 'no-response' };
          if (value?.providerId === providerId && value.status === 'ready') {
            result = value;
          } else if (
            result?.providerId !== providerId ||
            !Number.isFinite(result?.expiresAt) ||
            result.expiresAt <= Date.now()
          ) {
            result = undefined;
          }
          onChange();
        }
        resolve();
      };
      const cancelled = () => finish({ status: 'unavailable', reason: 'timeout-or-cancelled' });
      abort.signal.addEventListener('abort', cancelled, { once: true });
      timer = setTimeout(() => abort.abort(), 15000);
      try {
        pi.events.emit('usage:query:v1', {
          session,
          sessionId,
          providerId,
          refresh: true,
          signal: abort.signal,
          respond(value) {
            const accepted = open && !offered && !done;
            if (accepted) offered = true;
            void Promise.resolve(value).then(
              (value) => {
                if (accepted) finish(value);
              },
              () => {
                if (accepted) finish(undefined);
              },
            );
            return accepted;
          },
        });
      } catch {
        finish(undefined);
      } finally {
        open = false;
      }
      if (!offered) finish({ status: 'unavailable', reason: 'no-service' });
    });
  }
  return {
    start(ctx) {
      cancel();
      context = ctx;
      // Defer so all extensions finish their session_start initialization.
      timer = setTimeout(() => {
        void refresh();
      }, 0);
      poll = setInterval(() => {
        void refresh();
      }, 60000);
    },
    values() {
      return usageValues(result);
    },
    diagnostic() {
      return {
        status: lastOutcome.status,
        reason: lastOutcome.reason,
        provider: lastOutcome.providerId,
        expiresAt: result?.expiresAt,
        fields: Object.keys(usageValues(result)),
      };
    },
    refresh,
    stop() {
      cancel();
      context = undefined;
    },
  };
}
