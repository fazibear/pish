import { paint } from './config.js';

// Reserve the marker column and keep block spacing consistent across components.
export function renderBlock(width, config, role, visibleWidth, render) {
  const available = width - visibleWidth(config.marker) - 1;
  if (available < 1) return [];
  const rows = render(available);
  const prefix = `${paint(config.marerColors[role], config.marker)} `;
  return [...rows.map((line) => prefix + line), '', ''];
}
