import { paint } from './config.js';

export function patchPendingMessages(InteractiveMode, getConfig, { Text, visibleWidth }) {
  const proto = InteractiveMode.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'updatePendingMessagesDisplay');
  if (typeof descriptor?.value !== 'function') throw new Error('Unsupported pi pending-message display');
  Object.defineProperty(proto, 'updatePendingMessagesDisplay', {
    ...descriptor,
    value() {
      this.pendingMessagesContainer.clear();
      const { steering, followUp } = this.getAllQueuedMessages();
      if (!steering.length && !followUp.length) return;
      const content = [
        ...steering.map(message => `Steering: ${message}`),
        ...followUp.map(message => `Follow-up: ${message}`),
        `↳ ${this.getAppKeyDisplay('app.message.dequeue')} to edit all queued messages`,
      ].join('\n');
      this.pendingMessagesContainer.addChild({
        invalidate() {},
        render(width) {
          const config = getConfig();
          const available = width - visibleWidth(config.marker) - 1;
          if (available < 1) return [];
          const marker = paint(config.marerColors.user, config.marker);
          return [...new Text(content, 0, 0).render(available).map(line => marker + ' ' + line), '', ''];
        },
      });
    },
  });
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    Object.defineProperty(proto, 'updatePendingMessagesDisplay', descriptor);
  };
}
