import { patchMethod } from './patch.js';

// Pish's transcript already supplies the gap before the next prompt.
export function patchUserMessageSpacing(InteractiveMode, Spacer) {
  return patchMethod(
    InteractiveMode.prototype,
    'addMessageToChat',
    (original) =>
      function (message, ...args) {
        const children = this.chatContainer.children;
        const start = children.length;
        try {
          return original.call(this, message, ...args);
        } finally {
          if (message.role === 'user' && children[start] instanceof Spacer) {
            children.splice(start, 1);
          }
        }
      },
    'Unsupported pi message spacing',
  );
}

// Pish owns block spacing, so pi's additional pre-editor widget spacer is redundant.
export function patchWidgetSpacing(InteractiveMode) {
  return patchMethod(
    InteractiveMode.prototype,
    'renderWidgetContainer',
    (original) =>
      function (container, widgets) {
        return original.call(this, container, widgets, false, false);
      },
    'Unsupported pi widget spacing',
  );
}
