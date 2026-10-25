import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchTranscript, sections } from '../src/transcript.js';

const config = configure();
class Text {
  constructor(text) {
    this.text = text;
  }
  render() {
    return this.text.split('\n');
  }
}
const deps = { visibleWidth: (s) => s.length, Markdown: Text, Text, getMarkdownTheme: () => ({}) };
test('source fences support backticks, tildes and streaming', () => {
  assert.deepEqual(
    sections('hello\n```js\nx\n```\nbye').map((s) => s.code),
    [false, true, false],
  );
  assert.deepEqual(
    sections('~~~\nx').map((s) => s.code),
    [true],
  );
  assert.equal(sections('    ```\nx')[0].code, false);
});
test('user renderer reads source, not original rendered output', () => {
  class User {
    text = 'hello';
    render() {
      throw Error('must not call original');
    }
  }
  const restore = patchTranscript([[User, 'user']], () => config, deps);
  assert.deepEqual(new User().render(80), [`${paint(config.marerColors.user, '▌')} hello`, '', '']);
  restore();
  restore();
  assert.throws(() => new User().render());
});
test('assistant code uses code color and omits tool-call-only messages', () => {
  class Assistant {
    lastMessage = { content: [{ type: 'text', text: '```js\nx\n```' }] };
    render() {}
  }
  const restore = patchTranscript([[Assistant, 'assistant']], () => config, deps);
  const instance = new Assistant();
  assert.equal(instance.render(80)[1], `${paint(config.marerColors.code, '▌')} x`);
  instance.lastMessage = { content: [{ type: 'toolCall' }] };
  assert.deepEqual(instance.render(80), []);
  restore();
});
test('thinking and answer are separated by two empty lines', () => {
  class Assistant {
    lastMessage = {
      content: [
        { type: 'thinking', thinking: 'Thinking' },
        { type: 'text', text: 'Answer' },
      ],
    };
    render() {}
  }
  const restore = patchTranscript([[Assistant, 'assistant']], () => config, deps);
  try {
    const rows = new Assistant().render(80);
    assert.deepEqual(rows.slice(1, 3), ['', '']);
    assert.ok(rows[0].includes('Thinking'));
    assert.ok(rows[3].includes('Answer'));
    const hidden = new Assistant();
    hidden.hideThinkingBlock = true;
    hidden.hiddenThinkingLabel = 'Thinking…';
    assert.deepEqual(hidden.render(80).slice(1, 3), ['', '']);
  } finally {
    restore();
  }
});
test('tools bypass box rendering and prefix images', () => {
  class Tool {
    result = { isError: true };
    contentBox = {
      children: [new Text('failure')],
      render() {
        throw Error('boxed output');
      },
    };
    imageComponents = [{ render: () => ['native-image'] }];
    hasRendererDefinition() {
      return true;
    }
    getRenderShell() {
      return 'default';
    }
    render() {
      throw Error('original');
    }
  }
  const restore = patchTranscript([[Tool, 'tool']], () => config, deps);
  assert.deepEqual(new Tool().render(80), [
    `${paint(config.marerColors.error, '▌')} failure`,
    `${paint(config.marerColors.error, '▌')} native-image`,
    '',
    '',
  ]);
  restore();
});
