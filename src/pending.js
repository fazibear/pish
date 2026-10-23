import { patchMethod } from './patch.js';
import { renderBlock } from './rendering.js';

export function patchPendingMessages(InteractiveMode, getConfig, { Text, visibleWidth }) {
  return patchMethod(
    InteractiveMode.prototype,
    'updatePendingMessagesDisplay',
    () =>
      function () {
        this.pendingMessagesContainer.clear();
        const { steering, followUp } = this.getAllQueuedMessages();
        if (!steering.length && !followUp.length) return;
        const content = [
          ...steering.map((message) => `Steering: ${message}`),
          ...followUp.map((message) => `Follow-up: ${message}`),
          `↳ ${this.getAppKeyDisplay('app.message.dequeue')} to edit all queued messages`,
        ].join('\n');
        this.pendingMessagesContainer.addChild({
          invalidate() {},
          render(width) {
            return renderBlock(width, getConfig(), 'user', visibleWidth, (available) =>
              new Text(content, 0, 0).render(available),
            );
          },
        });
      },
    'Unsupported pi pending-message display',
  );
}
