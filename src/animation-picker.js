import { workingIndicator } from './working-indicator.js';

export function createAnimationPicker(
  { tui, theme, done },
  sequences,
  current,
  { SelectList, truncateToWidth, now = Date.now, schedule = setInterval, cancel = clearInterval },
) {
  const started = now();
  const items = Object.keys(sequences).map((name) => ({ value: name, label: name }));
  const list = new SelectList(items, 10, {
    selectedPrefix: (text) => theme.fg('accent', text),
    selectedText: (text) => theme.fg('accent', text),
    description: (text) => theme.fg('muted', text),
    scrollInfo: (text) => theme.fg('dim', text),
    noMatch: (text) => theme.fg('warning', text),
  });
  list.setSelectedIndex(
    Math.max(
      0,
      items.findIndex((item) => item.value === current),
    ),
  );
  let disposed = false;
  const timer = schedule(() => {
    if (!disposed) {
      list.invalidate();
      tui.requestRender();
    }
  }, 100);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancel(timer);
  }
  function finish(value) {
    if (disposed) return;
    dispose();
    done(value);
  }
  list.onSelect = (item) => finish(item.value);
  list.onCancel = () => finish(undefined);
  return {
    render(width) {
      const elapsed = now() - started;
      for (const item of items) {
        const frame = workingIndicator({ workingFrames: sequences[item.value] }, true, elapsed);
        item.label = `${frame}  ${item.value}${item.value === current ? ' ●' : ''}`;
      }
      return [
        theme.fg('accent', 'Working animation'),
        '',
        ...list.render(width),
        '',
        theme.fg('dim', '↑/↓ choose · enter select · esc cancel'),
      ].map((line) => truncateToWidth(line, width));
    },
    handleInput(data) {
      if (!disposed) list.handleInput(data);
    },
    handleMouse(event) {
      if (!disposed) return list.handleMouse?.(event);
    },
    invalidate() {
      list.invalidate();
    },
    dispose,
  };
}

export function pickAnimation(ctx, sequences, current, deps) {
  return ctx.ui.custom((tui, theme, _keys, done) =>
    createAnimationPicker({ tui, theme, done }, sequences, current, deps),
  );
}
