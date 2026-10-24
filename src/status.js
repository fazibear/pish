import { paint } from './config.js';
import { patchMethod } from './patch.js';
import { renderBlock } from './rendering.js';

export function patchStatusMessages(InteractiveMode, getConfig, { Text, visibleWidth }) {
  const proto = InteractiveMode.prototype;
  const previous = new WeakMap();
  const undo = [];
  const restore = () =>
    undo
      .splice(0)
      .reverse()
      .forEach((fn) => {
        fn();
      });

  function component(role, getText) {
    return {
      invalidate() {},
      render(width) {
        const config = getConfig();
        return renderBlock(width, config, role, visibleWidth, (available) =>
          new Text(getText(config), 0, 0).render(available),
        );
      },
    };
  }

  try {
    undo.push(
      patchMethod(
        proto,
        'showStatus',
        () =>
          function (message) {
            const last = previous.get(this);
            if (last && this.chatContainer.children.at(-1) === last) {
              last.setText(message);
            } else {
              let content = message;
              const status = component('status', () => content);
              status.setText = (text) => {
                content = text;
              };
              this.chatContainer.addChild(status);
              previous.set(this, status);
            }
            this.ui.requestRender();
          },
        'Unsupported pi status renderer',
      ),
    );

    if (typeof Object.getOwnPropertyDescriptor(proto, 'suggestBugReport')?.value === 'function') {
      undo.push(
        patchMethod(
          proto,
          'suggestBugReport',
          () =>
            function () {
              if (this.bugReportHintShown) return;
              this.bugReportHintShown = true;
              this.chatContainer.addChild(
                component('bugReport', (config) =>
                  paint(
                    config.textColors.muted ?? config.marerColors.right,
                    'If this looks like a pi bug, /bug sends a report to the developers.',
                  ),
                ),
              );
              this.ui.requestRender();
            },
        ),
      );
    }

    for (const [name, level, role, token] of [
      ['showError', 'Error', 'error', 'error'],
      ['showWarning', 'Warning', 'warning', 'warning'],
    ]) {
      if (typeof Object.getOwnPropertyDescriptor(proto, name)?.value !== 'function') continue;
      undo.push(
        patchMethod(
          proto,
          name,
          () =>
            function (message) {
              this.chatContainer.addChild(
                component(role, (config) =>
                  paint(
                    config.textColors[token] ??
                      config.marerColors[role === 'warning' ? 'tool' : role],
                    `${level}: ${message}`,
                  ),
                ),
              );
              this.ui.requestRender();
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
