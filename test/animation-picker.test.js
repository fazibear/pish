import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnimationPicker } from '../src/animation-picker.js';

function setup() {
  let elapsed = 0;
  let tick;
  let renders = 0;
  let cancelled = 0;
  const results = [];
  class SelectList {
    constructor(items) {
      this.items = items;
    }
    setSelectedIndex(index) {
      this.index = index;
    }
    invalidate() {}
    render() {
      return this.items.map((item) => item.label);
    }
    handleInput(key) {
      if (key === 'enter') this.onSelect(this.items[this.index]);
      if (key === 'escape') this.onCancel();
    }
  }
  const component = createAnimationPicker(
    {
      tui: {
        requestRender() {
          renders++;
        },
      },
      theme: { fg: (_color, text) => text },
      done: (value) => results.push(value),
    },
    { first: 'ab', second: '🭰▕' },
    'second',
    {
      SelectList,
      truncateToWidth: (text, width) => text.slice(0, width),
      now: () => elapsed,
      schedule(callback, delay) {
        assert.equal(delay, 100);
        tick = callback;
        return 42;
      },
      cancel(timer) {
        assert.equal(timer, 42);
        cancelled++;
      },
    },
  );
  return {
    component,
    results,
    advance() {
      elapsed += 100;
      tick();
    },
    get renders() {
      return renders;
    },
    get cancelled() {
      return cancelled;
    },
  };
}

test('picker animates every row one Unicode frame at a time', () => {
  const state = setup();
  try {
    assert.deepEqual(state.component.render(80).slice(2, 4), ['a  first', '🭰  second ●']);
    state.advance();
    assert.equal(state.renders, 1);
    assert.deepEqual(state.component.render(80).slice(2, 4), ['b  first', '▕  second ●']);
    state.advance();
    assert.equal(state.component.render(80)[2], 'a  first');
    assert.ok(state.component.render(3).every((line) => line.length <= 3));
  } finally {
    state.component.dispose();
  }
});

test('selection and cancellation dispose the timer exactly once', () => {
  for (const key of ['enter', 'escape']) {
    const state = setup();
    state.component.handleInput(key);
    assert.deepEqual(state.results, [key === 'enter' ? 'second' : undefined]);
    assert.equal(state.cancelled, 1);
    state.component.dispose();
    state.component.handleInput('enter');
    state.advance();
    assert.equal(state.renders, 0);
    assert.equal(state.cancelled, 1);
    assert.equal(state.results.length, 1);
  }
});
