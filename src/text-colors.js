import { paint } from './config.js';
import { patchMethod } from './patch.js';

// Override theme foreground tokens at their source, including tool renderers.
export function patchTextColors(Theme, getConfig) {
  const undo = [];
  const restore = () =>
    undo
      .splice(0)
      .reverse()
      .forEach((fn) => {
        fn();
      });
  try {
    for (const name of ['fg', 'getFgAnsi']) {
      undo.push(
        patchMethod(
          Theme.prototype,
          name,
          (original) =>
            function (token, text) {
              const color = getConfig().textColors[token];
              if (!color) return original.call(this, token, text);
              return name === 'fg' ? paint(color, text) : paint(color, '').slice(0, -5);
            },
        ),
      );
    }
  } catch (error) {
    restore();
    throw error;
  }
  return restore;
}
