// Split source fences, not terminal output. Markdown owns inline formatting,
// wrapping and syntax highlighting within each section.
export function sections(source) {
  const result = [];
  let lines = [];
  let fence = '';
  let fenceLength = 0;
  const flush = (code) => {
    if (lines.length) result.push({ text: lines.join('\n'), code });
    lines = [];
  };
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    const char = trimmed[0];
    let count = 0;
    while (count < trimmed.length && trimmed[count] === char) count++;
    const opening = indent <= 3 && (char === '`' || char === '~') && count >= 3;
    if (!fence && opening) {
      flush(false);
      fence = char;
      fenceLength = count;
      lines.push(line);
    } else if (fence && char === fence && count >= fenceLength && !trimmed.slice(count).trim()) {
      lines.push(line);
      flush(true);
      fence = '';
    } else {
      lines.push(line);
    }
  }
  flush(Boolean(fence));
  return result;
}
