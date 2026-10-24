export function workingIndicator(config, busy, elapsed = 0) {
  if (!busy) return '';
  // Iterate code points so supplementary Unicode block glyphs stay intact.
  const sequence =
    typeof config.workingFrames === 'string'
      ? config.workingFrames
      : config.workingFrames[config.workingAnimation];
  const frames = Array.from(sequence);
  return frames[Math.floor(elapsed / 100) % frames.length];
}
