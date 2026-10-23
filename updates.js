import { paint } from './config.js';

// Replace the notification builders, never inspect/rewrite their terminal output.
export function patchUpdates(InteractiveMode, getConfig, { Text, Markdown, visibleWidth, getMarkdownTheme }) {
  const proto = InteractiveMode.prototype;
  const undo = [];
  function add(mode, heading, body, note) {
    mode.chatContainer.addChild({
      invalidate() {},
      render(width) {
        const config = getConfig();
        const available = width - visibleWidth(config.marker) - 1;
        if (available < 1) return [];
        const marker = paint(config.colors.tool, config.marker);
        const text = new Text(heading + '\n' + body, 0, 0);
        const rows = text.render(available);
        if (note) {
          rows.push('');
          const theme = mode.getMarkdownThemeWithSettings?.() ?? getMarkdownTheme();
          rows.push(...new Markdown(note, 0, 0, theme).render(available));
        }
        return [...rows.map(line => marker + ' ' + line), '', ''];
      },
    });
    mode.ui.requestRender();
  }
  try {
    for (const [name, replacement] of [
      ['showNewVersionNotification', function(release) {
        add(this, 'Update Available', `New version ${release.version} is available. Run pi update\nChangelog: https://pi.dev/changelog`, release.note?.trim());
      }],
      ['showPackageUpdateNotification', function(packages) {
        add(this, 'Package Updates Available', 'Run pi update --extensions\nPackages:\n' + packages.map(pkg => `- ${pkg}`).join('\n'));
      }],
    ]) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof descriptor?.value !== 'function') throw new Error(`Unsupported pi notification: ${name}`);
      Object.defineProperty(proto, name, { ...descriptor, value: replacement });
      undo.push(() => Object.defineProperty(proto, name, descriptor));
    }
  } catch (error) { undo.reverse().forEach(fn => fn()); throw error; }
  return () => undo.splice(0).reverse().forEach(fn => fn());
}
