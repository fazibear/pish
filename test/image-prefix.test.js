import test from 'node:test';
import assert from 'node:assert/strict';
import { prefixImage } from '../src/image-prefix.js';
import { configure } from '../src/config.js';
import { styleBlockLine } from '../src/rendering.js';

const config = configure({});
const prefix = (line) => styleBlockLine(config, 'tool', line);
const render = (rows) =>
  prefixImage(
    {
      render: (width) => {
        assert.equal(width, 78);
        return rows;
      },
    },
    80,
    config,
    'tool',
    (text) => text.length,
  );

test('Kitty continuation rows remain blank so pi pre-clears before drawing', () => {
  const image = '\x1b_Ga=T,f=100,c=20,r=3,C=1;YWJj\x1b\\';
  const rows = [image, '', ''];
  assert.deepEqual(render(rows), [
    '\r' +
      prefix('') +
      '\x1b[1B\r' +
      prefix('') +
      '\x1b[1B\r' +
      prefix('') +
      '\x1b[2A\r' +
      prefix(image),
    '',
    '',
  ]);
  assert.deepEqual(rows, [image, '', '']);
});

test('iTerm2 preserves native height, payload and bottom-row anchor', () => {
  const image = '\x1b[2A\x1b]1337;File=inline=1;size=3;width=20;height=auto:YWJj\x07';
  assert.deepEqual(render(['', '', image]), [
    '',
    '',
    '\r\x1b[2A' +
      prefix('') +
      '\x1b[1B\r' +
      prefix('') +
      '\x1b[1B\r' +
      prefix('') +
      '\r' +
      prefix(image),
  ]);
});

test('single-row images and text fallbacks retain their row count', () => {
  const image = '\x1b]1337;File=inline=1:YWJj\x07';
  assert.deepEqual(render([image]), ['\r' + prefix('') + '\r' + prefix(image)]);
  assert.deepEqual(render(['[image]']), [prefix('[image]')]);
});

test('narrow terminals do not render an image without room', () => {
  assert.deepEqual(
    prefixImage(
      {
        render() {
          throw new Error('no room');
        },
      },
      2,
      config,
      'tool',
      (text) => text.length,
    ),
    [],
  );
});
