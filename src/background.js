// Disable backgrounds at the theme API, before components render them.
// Prototype scope also covers themes selected after startup.
export function disableBackgrounds(Theme) {
  const proto = Theme.prototype;
  const originals = new Map();
  for (const [name, replacement] of [
    ['bg', (_color, text) => text],
    ['getBgAnsi', () => ''],
  ]) {
    originals.set(name, Object.getOwnPropertyDescriptor(proto, name));
    Object.defineProperty(proto, name, { configurable: true, writable: true, value: replacement });
  }
  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else delete proto[name];
    }
    originals.clear();
  };
}
