import { patchMethod } from './patch.js';
import { renderBlock } from './rendering.js';

// Replace the notification builders, never inspect/rewrite their terminal output.
export function patchUpdates(
  InteractiveMode,
  getConfig,
  { Text, Markdown, visibleWidth, getMarkdownTheme },
) {
  const proto = InteractiveMode.prototype;
  const undo = [];
  function add(mode, heading, body, note) {
    mode.chatContainer.addChild({
      invalidate() {},
      render(width) {
        return renderBlock(width, getConfig(), 'tool', visibleWidth, (available) => {
          const rows = new Text(`${heading}\n${body}`, 0, 0).render(available);
          if (note) {
            const theme = mode.getMarkdownThemeWithSettings?.() ?? getMarkdownTheme();
            rows.push('', ...new Markdown(note, 0, 0, theme).render(available));
          }
          return rows;
        });
      },
    });
    mode.ui.requestRender();
  }
  try {
    for (const [name, replacement] of [
      [
        'showNewVersionNotification',
        function (release) {
          add(
            this,
            'Update Available',
            `New version ${release.version} is available. Run pi update\nChangelog: https://pi.dev/changelog`,
            release.note?.trim(),
          );
        },
      ],
      [
        'showPackageUpdateNotification',
        function (packages) {
          add(
            this,
            'Package Updates Available',
            'Run pi update --extensions\nPackages:\n' +
              packages.map((pkg) => `- ${pkg}`).join('\n'),
          );
        },
      ],
    ]) {
      undo.push(
        patchMethod(proto, name, () => replacement, `Unsupported pi notification: ${name}`),
      );
    }
  } catch (error) {
    undo.reverse().forEach((fn) => {
      fn();
    });
    throw error;
  }
  return () =>
    undo
      .splice(0)
      .reverse()
      .forEach((fn) => {
        fn();
      });
}
