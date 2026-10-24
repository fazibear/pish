import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchTranscript } from '../src/transcript.js';

test('compaction summaries get bars without Box padding in both expansion states', () => {
  class Box {
    render() {
      throw new Error('padded Box should not render');
    }
  }
  class Compaction extends Box {
    expanded = false;
    children = [
      {
        render: (width) => {
          assert.equal(width, 78);
          return [
            '[compaction]',
            '',
            this.expanded ? 'Full summary' : 'Compacted from 483,814 tokens (ctrl+o to expand)',
          ];
        },
      },
    ];
    setExpanded(value) {
      this.expanded = value;
    }
  }
  const config = configure();
  const restore = patchTranscript([[Compaction, 'compaction']], () => config, {
    visibleWidth: (text) => text.length,
  });
  try {
    const instance = new Compaction();
    const prefix = `${paint(config.marerColors.tool, config.marker)} `;
    assert.deepEqual(instance.render(80), [
      prefix + '[compaction]',
      prefix,
      prefix + 'Compacted from 483,814 tokens (ctrl+o to expand)',
      '',
      '',
    ]);
    instance.setExpanded(true);
    assert.ok(instance.render(80)[2].endsWith('Full summary'));
  } finally {
    restore();
  }
  assert.equal(Object.hasOwn(Compaction.prototype, 'render'), false);
});
