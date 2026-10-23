import { paint } from './config.js';

export function patchStatusMessages(InteractiveMode, getConfig, { Text, visibleWidth }) {
  const proto = InteractiveMode.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'showStatus');
  if (typeof descriptor?.value !== 'function') throw new Error('Unsupported pi status renderer');
  const previous = new WeakMap();
  Object.defineProperty(proto, 'showStatus', {
    ...descriptor,
    value(message) {
      const children = this.chatContainer.children;
      const last = previous.get(this);
      if (last && children.at(-1) === last) {
        last.setText(message);
      } else {
        let content = message;
        const component = {
          setText(text) { content = text; },
          invalidate() {},
          render(width) {
            const config = getConfig();
            const available = width - visibleWidth(config.marker) - 1;
            if (available < 1) return [];
            const marker = paint(config.colors.tool, config.marker);
            return [...new Text(content, 0, 0).render(available).map(line => marker + ' ' + line), '', ''];
          },
        };
        this.chatContainer.addChild(component);
        previous.set(this, component);
      }
      this.ui.requestRender();
    },
  });
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    Object.defineProperty(proto, 'showStatus', descriptor);
  };
}
