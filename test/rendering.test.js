import assert from 'node:assert/strict';
import test from 'node:test';
import { configure, paint } from '../src/config.js';
import { renderBlock } from '../src/rendering.js';

const visibleWidth = (text) => [...text].length;

test('blocks reserve marker space, prefix rows, and append two blank lines', () => {
  const config = configure();
  const rows = renderBlock(20, config, 'tool', visibleWidth, (width) => {
    assert.equal(width, 18);
    return ['first', '', 'last'];
  });
  const prefix = `${paint(config.marerColors.tool, config.marker)} `;
  assert.deepEqual(rows, [`${prefix}first`, prefix, `${prefix}last`, '', '']);
});

test('blocks skip rendering when the marker leaves no content space', () => {
  assert.deepEqual(
    renderBlock(2, configure(), 'user', visibleWidth, () => {
      assert.fail('content should not render');
    }),
    [],
  );
});
