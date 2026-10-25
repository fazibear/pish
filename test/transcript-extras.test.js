import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchTranscriptNotices } from '../src/notices.js';
import { patchTranscript } from '../src/transcript.js';

class Container {
  constructor(children = []) {
    this.children = children;
  }
  render() {
    throw new Error('container chrome should not render');
  }
}
class Box extends Container {}
class Text {
  constructor(text) {
    this.text = text;
  }
  render() {
    return [this.text];
  }
}
class Image {
  render() {
    return ['native-image'];
  }
}
class Spacer {
  render() {
    return [''];
  }
}
const deps = { Container, Box, Text, Image, Spacer, visibleWidth: (text) => text.length };
const config = configure();
const prefix = (role) => `${paint(config.marerColors[role], config.marker)} `;

test('bash, summary, skill, and custom components render content without chrome', () => {
  class Bash extends Container {
    contentContainer = new Container([new Text('$ ls'), new Text('file')]);
  }
  class Summary extends Box {}
  class Skill extends Box {}
  class Custom extends Container {
    box = new Box([new Text('extension'), new Image()]);
  }
  const restore = patchTranscript(
    [
      [Bash, 'bash'],
      [Summary, 'summary'],
      [Skill, 'skill'],
      [Custom, 'custom'],
    ],
    () => config,
    deps,
  );
  try {
    assert.deepEqual(new Bash().render(80), [
      prefix('tool') + '$ ls',
      prefix('tool') + 'file',
      '',
      '',
    ]);
    const failed = new Bash();
    failed.status = 'error';
    assert.ok(failed.render(80)[0].startsWith(prefix('error')));
    assert.deepEqual(new Summary([new Text('branch summary')]).render(80), [
      prefix('tool') + 'branch summary',
      '',
      '',
    ]);
    assert.deepEqual(new Skill([new Text('skill')]).render(80), [prefix('tool') + 'skill', '', '']);
    assert.deepEqual(new Custom().render(80), [
      prefix('tool') + 'extension',
      prefix('tool') + 'native-image',
      '',
      '',
    ]);
    const custom = new Custom();
    custom.customComponent = new Text('custom renderer');
    assert.deepEqual(custom.render(80), [prefix('tool') + 'custom renderer', '', '']);
  } finally {
    restore();
  }
});

test('direct notices keep native builders and get bars without leading spacers', () => {
  class Mode {
    chatContainer = { children: [] };
    addCacheMissNotice(message) {
      if (!message) return;
      this.chatContainer.children.push(new Spacer(), new Text(message));
      return 42;
    }
  }
  const original = Mode.prototype.addCacheMissNotice;
  const restore = patchTranscriptNotices(Mode, () => config, deps);
  const mode = new Mode();
  try {
    assert.equal(mode.addCacheMissNotice('Cache miss'), 42);
    assert.equal(mode.chatContainer.children.length, 1);
    assert.deepEqual(mode.chatContainer.children[0].render(80), [
      prefix('tool') + 'Cache miss',
      '',
      '',
    ]);
    mode.addCacheMissNotice('');
    assert.equal(mode.chatContainer.children.length, 1);
  } finally {
    restore();
  }
  assert.equal(Mode.prototype.addCacheMissNotice, original);
  assert.deepEqual(mode.chatContainer.children[0].render(80), ['Cache miss']);
});

test('custom entries inserted before streaming output receive restorable bars', () => {
  class Entry extends Container {
    customComponent = new Text('entry');
  }
  class Mode {
    chatContainer = { children: [new Text('streaming')] };
    addCustomEntryToChat() {
      this.chatContainer.children.splice(0, 0, new Entry());
    }
  }
  const restore = patchTranscriptNotices(Mode, () => config, deps);
  try {
    const mode = new Mode();
    mode.addCustomEntryToChat();
    mode.addCustomEntryToChat();
    assert.deepEqual(mode.chatContainer.children[0].render(80), [prefix('tool') + 'entry', '', '']);
  } finally {
    restore();
  }
  assert.equal(Object.hasOwn(Entry.prototype, 'render'), false);
});
