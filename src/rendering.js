import { paint } from './config.js';

export function styleBlockLine(config, role, line) {
  return `${paint(config.marerColors[role], config.marker)} ${line}`;
}

// Reserve the marker column and keep block spacing consistent across components.
export function renderBlock(width, config, role, visibleWidth, render) {
  const available = width - visibleWidth(config.marker) - 1;
  if (available < 1) return [];
  const rows = render(available);
  return [...rows.map((line) => styleBlockLine(config, role, line)), '', ''];
}
