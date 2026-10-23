const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const defaults = {
  marker: '▌',
  cursorShape: 'bar',
  cursorBlink: false,
  fakeCursorEnabled: true,
  fakeCursorAlways: false,
  marerColors: {
    user: '#2456a6',
    assistant: '#27633b',
    thinking: '#505050',
    tool: '#663399',
    code: '#574080',
    error: '#a63333',
    input: '#2456a6',
    right: '#808080',
  },
  rightPrompt:
    '{model} · {thinking} · {context_used}/{context_limit} ({context_percent_used}) · {cwd}',
  textColors: {},
  workingFrames: '▌▋▊▉█▉▊▋▌▍▎▏▎▍',
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isColor = (value) => typeof value === 'string' && HEX_COLOR.test(value);
const isPrintableLine = (value) => typeof value === 'string' && !CONTROL_CHARACTERS.test(value);
const isMarker = (value) => isPrintableLine(value) && value.length >= 1 && value.length <= 8;

function requireValid(valid, message) {
  if (!valid) throw new Error(message);
}

export function configure(value = {}) {
  requireValid(isObject(value), 'Config must be an object');
  const result = {
    ...defaults,
    ...value,
    marerColors: { ...defaults.marerColors, ...value.marerColors },
  };

  requireValid(
    ['default', 'block', 'underline', 'bar'].includes(result.cursorShape),
    'cursorShape must be default, block, underline, or bar',
  );
  for (const key of ['cursorBlink', 'fakeCursorEnabled', 'fakeCursorAlways']) {
    requireValid(typeof result[key] === 'boolean', `${key} must be boolean`);
  }
  requireValid(isObject(result.textColors), 'textColors must be an object');
  requireValid(Object.values(result.textColors).every(isColor), 'textColors must use #rrggbb');
  requireValid(isMarker(result.marker), 'marker must be 1–8 printable characters');
  requireValid(isPrintableLine(result.rightPrompt), 'rightPrompt must be a single printable line');
  requireValid(
    isPrintableLine(result.workingFrames) && result.workingFrames.length > 0,
    'workingFrames must be a non-empty printable string',
  );
  requireValid(Object.values(result.marerColors).every(isColor), 'Colors must use #rrggbb');
  return result;
}

export function paint(color, text) {
  const rgb = color
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16));
  return `\x1b[38;2;${rgb.join(';')}m${text}\x1b[39m`;
}

export function template(format, values) {
  return format.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? '').replace(/[\x00-\x1f\x7f]/g, ''),
  );
}
