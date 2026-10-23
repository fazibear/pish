import { paint } from './config.js';
import { styleFakeCursor } from './fake-cursor.js';
import { attachRightPrompt, promptLayout, rightPrompt } from './right-prompt.js';
import { workingIndicator } from './working-indicator.js';

export function createShellEditor(
  BaseEditor,
  { tui, theme, keys, getConfig, getPromptState, visibleWidth, truncateToWidth },
) {
  class ShellEditor extends BaseEditor {
    render(width) {
      const config = getConfig();
      const { busy, elapsed, ctx, pi, branch, usageStatus, usageValues } = getPromptState();
      const marker = workingIndicator(config, busy, elapsed) || config.marker;
      const prefix = `${paint(config.marerColors.input, marker)} `;
      const status = rightPrompt(config, ctx, pi, branch, usageStatus, usageValues);
      const layout = promptLayout(
        width,
        visibleWidth(marker) + 1,
        status,
        { visibleWidth, truncateToWidth },
        this.getText(),
      );
      if (layout.editorWidth < 5) return [...super.render(width), '', ''];

      // Suppress borders at their styling hook, before output is rendered.
      const borderColor = this.borderColor;
      this.borderColor = () => '';
      try {
        const lines = super
          .render(layout.editorWidth)
          .filter((line) => line !== '')
          .map((line) => prefix + styleFakeCursor(line, config, tui.getShowHardwareCursor()));
        return [
          ...attachRightPrompt(lines, layout.right, width, config.marerColors.right, visibleWidth),
          '',
          '',
        ];
      } finally {
        this.borderColor = borderColor;
      }
    }
  }
  return new ShellEditor(tui, theme, keys);
}
