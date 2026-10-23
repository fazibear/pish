import assert from 'node:assert/strict';
import test from 'node:test';
import { configure, paint } from '../src/config.js';
import { createShellEditor } from '../src/editor.js';

class BaseEditor {
  borderColor = (text) => text;
  getText() {
    return 'hello';
  }
  render(width) {
    this.lastWidth = width;
    return [this.borderColor('border'), 'hello', this.borderColor('border')];
  }
}

function editor(Base = BaseEditor, getConfig = () => configure({ rightPrompt: '' })) {
  return createShellEditor(Base, {
    tui: { getShowHardwareCursor: () => true },
    getConfig,
    getPromptState: () => ({
      busy: false,
      elapsed: 0,
      ctx: { getContextUsage: () => undefined, cwd: '/tmp', isIdle: () => true },
      pi: { getThinkingLevel: () => 'low' },
    }),
    visibleWidth: (text) => [...text].length,
    truncateToWidth: (text, width) => text.slice(0, width),
  });
}

test('shell editor suppresses borders and restores the styling hook', () => {
  const instance = editor();
  const original = instance.borderColor;
  const config = configure();
  assert.deepEqual(instance.render(40), [
    `${paint(config.marerColors.input, config.marker)} hello`,
    '',
    '',
  ]);
  assert.equal(instance.lastWidth, 38);
  assert.equal(instance.borderColor, original);
});

test('shell editor restores the styling hook when rendering fails', () => {
  class BrokenEditor extends BaseEditor {
    render() {
      throw new Error('render failed');
    }
  }
  const instance = editor(BrokenEditor);
  const original = instance.borderColor;
  assert.throws(() => instance.render(40), /render failed/);
  assert.equal(instance.borderColor, original);
});

test('shell editor reads configuration again on each render', () => {
  let config = configure({ rightPrompt: '' });
  const instance = editor(BaseEditor, () => config);
  instance.render(40);
  config = configure({ marker: '>', rightPrompt: '' });
  assert.equal(instance.render(40)[0], `${paint(config.marerColors.input, '>')} hello`);
});

test('narrow terminals retain the base editor fallback', () => {
  assert.deepEqual(editor().render(5), ['border', 'hello', 'border', '', '']);
});
