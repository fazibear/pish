import { homedir } from 'node:os';
import { sep } from 'node:path';
import { paint, template } from './config.js';

export function displayDirectory(directory, home = homedir()) {
  if (directory === home) return '~';
  return directory.startsWith(home + sep) ? `~${directory.slice(home.length)}` : directory;
}

export function formatElapsed(milliseconds) {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds % 60}s`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function rightPrompt(
  config,
  ctx,
  pi,
  branch = '',
  usageStatus = '',
  usageFields = {},
  elapsed = 0,
) {
  const usage = ctx.getContextUsage();
  const limit = ctx.model?.contextWindow;
  const tokens = usage?.tokens;
  const fmt = (n) => (n == null ? '?' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const format = config.rightPrompt;
  const values = {
    ...usageFields,
    working: '',
    elapsed: ctx.isIdle() ? '' : formatElapsed(elapsed),
    model: ctx.model?.id ?? 'no-model',
    provider: ctx.model?.provider ?? '',
    cwd: displayDirectory(ctx.cwd),
    dir: ctx.cwd.split(/[\\/]/).pop(),
    branch,
    context_used: fmt(tokens),
    context_limit: fmt(limit),
    context_left: fmt(tokens == null || limit == null ? undefined : Math.max(0, limit - tokens)),
    context_percent_used: tokens == null || !limit ? '?' : `${Math.round((tokens / limit) * 100)}%`,
    context_percent_left:
      tokens == null || !limit ? '?' : `${Math.max(0, 100 - Math.round((tokens / limit) * 100))}%`,
    thinking: pi.getThinkingLevel(),
    status: ctx.isIdle() ? 'idle' : 'working',
  };
  // Footer statuses are already styled TUI strings. Keep their ANSI colors
  // outside the plain-text placeholder sanitizer.
  return format
    .split('{usage}')
    .map((part) => {
      // Parse only the configured format, never placeholder values or usage output.
      const colored = part.replace(/\{#([0-9a-f]{6})?\}/gi, (_, hex) =>
        paint(hex ? `#${hex}` : config.marerColors.right, '').slice(0, -5),
      );
      return template(colored, values);
    })
    .join(usageStatus);
}

export function promptLayout(
  width,
  prefixWidth,
  text,
  { visibleWidth, truncateToWidth },
  input = '',
  directory = '',
) {
  const budget = Math.max(0, Math.min(Math.floor(width / 2), width - prefixWidth - 12));
  // Preserve the useful end of the directory before truncating other fields.
  const path = displayDirectory(directory).replace(/[\x00-\x1f\x7f]/g, '');
  if (path && text.includes(path) && visibleWidth(text) > budget) {
    const characters = Array.from(path);
    const available = Math.max(1, budget - (visibleWidth(text) - visibleWidth(path)));
    while (characters.length && visibleWidth(`…${characters.join('')}`) > available) {
      characters.shift();
    }
    text = text.replace(path, `…${characters.join('')}`);
  }
  let right = text && budget >= 8 ? truncateToWidth(text, budget) : '';
  let reserved = right ? visibleWidth(right) + 2 : 0;
  const longestLine = Math.max(...input.split('\n').map((line) => visibleWidth(line)));
  // Leave room for the editor cursor. Reclaim the entire width when typing
  // reaches the right prompt, rather than wrapping early to accommodate it.
  if (right && longestLine + 1 >= width - prefixWidth - reserved) {
    right = '';
    reserved = 0;
  }
  return { right, editorWidth: Math.max(1, width - prefixWidth - reserved) };
}

export function attachRightPrompt(lines, text, width, color, visibleWidth) {
  if (!text || !lines.length) return lines;
  const result = [...lines];
  const gap = width - visibleWidth(result[0]) - visibleWidth(text);
  if (gap >= 2) result[0] += ' '.repeat(gap) + paint(color, text);
  return result;
}
