const shapes = { block: [1, 2], underline: [3, 4], bar: [5, 6] };

export function configureCursor(tui, config) {
  const previous = tui.getShowHardwareCursor();
  const custom = config.cursorShape !== 'default' && !config.fakeCursorAlways;
  let busy = false;

  function apply() {
    if (!custom) return;
    // During active streaming, keep hardware cursor hidden to avoid flicker.
    tui.setShowHardwareCursor(!busy);
    tui.terminal.write(`\x1b[${shapes[config.cursorShape][config.cursorBlink ? 0 : 1]} q`);
  }

  if (config.fakeCursorAlways) {
    tui.setShowHardwareCursor(false);
  } else {
    apply();
  }

  let restored = false;
  return {
    setBusy(value) {
      busy = Boolean(value);
      if (!config.fakeCursorAlways) apply();
    },
    restore() {
      if (restored) return;
      restored = true;
      tui.setShowHardwareCursor(previous);
      tui.terminal.write('\x1b[0 q');
    },
  };
}
