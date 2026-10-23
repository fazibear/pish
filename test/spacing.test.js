import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchWidgetSpacing } from '../src/spacing.js';
test('default editor spacer is disabled without removing widgets', () => {
  class Mode {
    renderWidgetContainer(container, widgets, empty, leading) {
      container.length = 0;
      if ((!widgets.size && empty) || (widgets.size && leading)) container.push('spacer');
      container.push(...widgets.values());
    }
  }
  const original = Mode.prototype.renderWidgetContainer;
  const restore = patchWidgetSpacing(Mode);
  const mode = new Mode();
  const rows = [];
  mode.renderWidgetContainer(rows, new Map(), true, true);
  assert.deepEqual(rows, []);
  mode.renderWidgetContainer(rows, new Map([['widget', 'content']]), true, true);
  assert.deepEqual(rows, ['content']);
  restore(); restore();
  assert.equal(Mode.prototype.renderWidgetContainer, original);
});
