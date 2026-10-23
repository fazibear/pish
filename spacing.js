// Pish's transcript already supplies the gap before the next prompt.
export function patchUserMessageSpacing(InteractiveMode, Spacer) {
  const proto = InteractiveMode.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'addMessageToChat');
  if (typeof descriptor?.value !== 'function') throw new Error('Unsupported pi message spacing');
  Object.defineProperty(proto, 'addMessageToChat', {
    ...descriptor,
    value(message, ...args) {
      const children = this.chatContainer.children;
      const start = children.length;
      try {
        return descriptor.value.call(this, message, ...args);
      } finally {
        if (message.role === 'user' && children[start] instanceof Spacer) {
          children.splice(start, 1);
        }
      }
    },
  });
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    Object.defineProperty(proto, 'addMessageToChat', descriptor);
  };
}

// Pish owns block spacing, so pi's additional pre-editor widget spacer is redundant.
export function patchWidgetSpacing(InteractiveMode) {
  const proto = InteractiveMode.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'renderWidgetContainer');
  if (typeof descriptor?.value !== 'function') throw new Error('Unsupported pi widget spacing');
  Object.defineProperty(proto, 'renderWidgetContainer', {
    ...descriptor,
    value(container, widgets) {
      return descriptor.value.call(this, container, widgets, false, false);
    },
  });
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    Object.defineProperty(proto, 'renderWidgetContainer', descriptor);
  };
}
