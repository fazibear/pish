import { patchMethod } from './patch.js';
import { renderBlock } from './rendering.js';
import { patchTranscript } from './transcript.js';

// These builders bypass showStatus/showWarning and add transcript components directly.
const NOTICE_BUILDERS = {
  addCacheWarmingUsage: 'cacheWarming',
  addCompactionCostNotice: 'compactionCost',
  maybeShowThinkingDropNotice: 'thinkingDrop',
  addCacheMissNotice: 'cacheMiss',
  renderProjectTrustWarningIfNeeded: 'projectTrust',
};

export function patchTranscriptNotices(InteractiveMode, getConfig, deps) {
  const undo = [];
  const entries = new Set();
  const styled = new WeakSet();
  const restore = () => {
    for (const fn of undo.splice(0).reverse()) fn();
    entries.clear();
  };
  try {
    for (const name of [...Object.keys(NOTICE_BUILDERS), 'addCustomEntryToChat']) {
      const proto = InteractiveMode.prototype;
      if (typeof Object.getOwnPropertyDescriptor(proto, name)?.value !== 'function') continue;
      undo.push(
        patchMethod(
          proto,
          name,
          (original) =>
            function (...args) {
              const children = this.chatContainer.children;
              const before = new Set(children);
              const result = original.apply(this, args);
              for (const child of [...children]) {
                if (before.has(child) || styled.has(child)) continue;
                if (name === 'addCustomEntryToChat') {
                  if (!entries.has(child.constructor)) {
                    undo.push(patchTranscript([[child.constructor, 'entry']], getConfig, deps));
                    entries.add(child.constructor);
                  }
                } else if (!(child instanceof deps.Spacer)) {
                  const descriptor = Object.getOwnPropertyDescriptor(child, 'render');
                  const render = child.render;
                  child.render = function (width) {
                    return renderBlock(
                      width,
                      getConfig(),
                      NOTICE_BUILDERS[name],
                      deps.visibleWidth,
                      (available) => render.call(this, available),
                    );
                  };
                  styled.add(child);
                  undo.push(() => {
                    if (descriptor) Object.defineProperty(child, 'render', descriptor);
                    else delete child.render;
                  });
                } else {
                  children.splice(children.indexOf(child), 1);
                }
              }
              return result;
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
