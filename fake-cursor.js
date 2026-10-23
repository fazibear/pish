// Pi renders cursor as marker sequences first, then resolves them to inverse-video.
// Preserve and underline the current grapheme; use an underlined space at EOL.
const CURSOR_MARKER = "\x1b_pi:c\x07";
const FAKE_START = "\x1b_pi:fc\x07";
const FAKE_END = "\x1b_pi:/fc\x07";

export function styleFakeCursor(line, config) {
  if (!config.fakeCursorEnabled) return line;
  const start = line.indexOf(FAKE_START);
  if (start >= 0) {
    const markerStart = line.slice(Math.max(0, start - CURSOR_MARKER.length), start) === CURSOR_MARKER
      ? start - CURSOR_MARKER.length
      : start;
    const marker = markerStart < start ? CURSOR_MARKER : "";
    const contentStart = start + FAKE_START.length;
    const end = line.indexOf(FAKE_END, contentStart);
    const cursorText = end >= 0 ? line.slice(contentStart, end) : line.slice(contentStart, contentStart + 1);
    const glyph = cursorText && cursorText !== ' ' ? cursorText : config.fakeCursorChar;
    const rendered = `\x1b[4m${glyph}\x1b[24m`;
    const tail = end >= 0 ? line.slice(end + FAKE_END.length) : "";
    return line.slice(0, markerStart) + marker + rendered + tail;
  }
  // Fallback if a future pi version resolves fake cursor earlier.
  return line.replace(/\x1b\[[0-9;]*7[0-9;]*m([\s\S])\x1b\[[0-9;]*27[0-9;]*m/, (_all, char) => {
    const glyph = char && char !== ' ' ? char : config.fakeCursorChar;
    return `\x1b[4m${glyph}\x1b[24m`;
  });
}
