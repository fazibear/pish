import { paint } from './config.js';

// Override theme foreground tokens at their source, including tool renderers.
export function patchTextColors(Theme, getConfig) {
  const proto = Theme.prototype;
  const undo = [];
  for (const name of ['fg', 'getFgAnsi']) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    const original = descriptor.value;
    Object.defineProperty(proto, name, {
      ...descriptor,
      value(token, text) {
        const color = getConfig().textColors[token];
        if (!color) return original.call(this, token, text);
        return name === 'fg' ? paint(color, text) : paint(color, '').slice(0, -5);
      },
    });
    undo.push(() => Object.defineProperty(proto, name, descriptor));
  }
  return () => undo.splice(0).reverse().forEach(fn => fn());
}
