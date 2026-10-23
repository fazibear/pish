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
