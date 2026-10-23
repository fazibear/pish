// Preserve method descriptors and make teardown safe to call more than once.
export function patchMethod(target, name, wrap, errorMessage = `Unsupported pi method: ${name}`) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  if (typeof descriptor?.value !== 'function') throw new Error(errorMessage);
  Object.defineProperty(target, name, {
    ...descriptor,
    value: wrap(descriptor.value),
  });
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    Object.defineProperty(target, name, descriptor);
  };
}
