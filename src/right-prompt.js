import { paint, template } from './config.js';

export function workingIndicator(config, busy, now = Date.now()) {
  if (!busy || config.workingIndicator === 'none') return '';
  if (config.workingIndicator === 'text') return config.workingText;
  // Each cycle starts and ends at the configured idle marker.
  const frames = [config.marker, '▋', '▊', '▉', '█', '▉', '▊', '▋', '▌', '▍', '▎', '▏', '▎', '▍', config.marker];
  return frames[Math.floor(now / 100) % frames.length];
}

export function rightPrompt(config, ctx, pi, branch = '', usageStatus = '', usageFields = {}) {
  const usage = ctx.getContextUsage();
  const limit = ctx.model?.contextWindow;
  const tokens = usage?.tokens;
  const fmt = n => n == null ? '?' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const format = config.rightPrompt;
  const values = {
    ...usageFields,
    working: '',
    model: ctx.model?.id ?? 'no-model', provider: ctx.model?.provider ?? '',
    cwd: ctx.cwd, dir: ctx.cwd.split(/[\\/]/).pop(), branch,
    context_used: fmt(tokens), context_limit: fmt(limit),
    context_left: fmt(tokens == null || limit == null ? undefined : Math.max(0, limit - tokens)),
    context_percent_used: tokens == null || !limit ? '?' : `${Math.round(tokens / limit * 100)}%`,
    context_percent_left: tokens == null || !limit ? '?' : `${Math.max(0, 100 - Math.round(tokens / limit * 100))}%`,
    thinking: pi.getThinkingLevel(), status: ctx.isIdle() ? 'idle' : 'working',
  };
  // Footer statuses are already styled TUI strings. Keep their ANSI colors
  // outside the plain-text placeholder sanitizer.
  return format.split('{usage}').map(part => template(part, values)).join(usageStatus);
}

export function promptLayout(width, prefixWidth, text, { visibleWidth, truncateToWidth }, input = '') {
  const budget = Math.max(0, Math.min(Math.floor(width / 2), width - prefixWidth - 12));
  let right = text && budget >= 8 ? truncateToWidth(text, budget) : '';
  let reserved = right ? visibleWidth(right) + 2 : 0;
  const longestLine = Math.max(...input.split('\n').map(line => visibleWidth(line)));
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
