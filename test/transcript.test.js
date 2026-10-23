import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure, paint } from '../config.js';
import { sections, patchTranscript } from '../transcript.js';
const config = configure();
class Text {
  constructor(text) { this.text = text; }
  render() { return this.text.split('\n'); }
}
const deps = { visibleWidth: s => s.length, Markdown: Text, Text, getMarkdownTheme: () => ({}) };
test('source fences support backticks, tildes and streaming', () => {
  assert.deepEqual(sections('hello\n```js\nx\n```\nbye').map(s => s.code), [false, true, false]);
  assert.deepEqual(sections('~~~\nx').map(s => s.code), [true]);
  assert.equal(sections('    ```\nx')[0].code, false);
});
test('user renderer reads source, not original rendered output', () => {
  class User { text = 'hello'; render() { throw Error('must not call original'); } }
  const restore = patchTranscript([[User, 'user']], () => config, deps);
  assert.deepEqual(new User().render(80), [paint(config.marerColors.user, '▌') + ' hello', '', '']);
  restore(); restore();
  assert.throws(() => new User().render());
});
test('assistant code uses code color and omits tool-call-only messages', () => {
  class Assistant { lastMessage = { content: [{ type: 'text', text: '```js\nx\n```' }] }; render() {} }
  const restore = patchTranscript([[Assistant, 'assistant']], () => config, deps);
  const instance = new Assistant();
  assert.equal(instance.render(80)[1], paint(config.marerColors.code, '▌') + ' x');
  instance.lastMessage = { content: [{ type: 'toolCall' }] };
  assert.deepEqual(instance.render(80), []);
  restore();
});
test('tools bypass box rendering and leave images untouched', () => {
  class Tool {
    result = { isError: true };
    contentBox = { children: [new Text('failure')], render() { throw Error('boxed output'); } };
    imageComponents = [{ render: () => ['native-image'] }];
    hasRendererDefinition() { return true; }
    getRenderShell() { return 'default'; }
    render() { throw Error('original'); }
  }
  const restore = patchTranscript([[Tool, 'tool']], () => config, deps);
  assert.deepEqual(new Tool().render(80), [paint(config.marerColors.error, '▌') + ' failure', 'native-image', '', '']);
  restore();
});
