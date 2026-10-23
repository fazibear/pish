export function workingIndicator(config, busy, elapsed = 0) {
  if (!busy) return '';
  // Iterate code points so supplementary Unicode block glyphs stay intact.
  const frames = Array.from(config.workingFrames);
  return frames[Math.floor(elapsed / 100) % frames.length];
}
