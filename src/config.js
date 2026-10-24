import { animations } from './animations.js';

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
    bash: '#663399',
    bashError: '#a63333',
    skill: '#663399',
    summary: '#663399',
    compaction: '#663399',
    custom: '#663399',
    entry: '#663399',
    status: '#a88420',
    warning: '#663399',
    bugReport: '#663399',
    cacheWarming: '#663399',
    compactionCost: '#663399',
    thinkingDrop: '#663399',
    cacheMiss: '#663399',
    projectTrust: '#663399',
    pending: '#2456a6',
    update: '#663399',
    code: '#574080',
    error: '#a63333',
    input: '#2456a6',
    right: '#808080',
  },
  rightPrompt:
    '{#de8d5a}{elapsed}{#} {#a798d7}{model}{#} {#9da5a9}{thinking}{#} · {#69add0}{context_percent_used}{#} · {#68b78d}{usage_5h_percent_left}{#}/{#9da5a9}{usage_5h_reset}{#} · {#5db3ba}{usage_7d_percent_left}{#}/{#9da5a9}{usage_7d_reset}{#} · {#cd9a22}{cwd}{#}',
  textColors: {
    text: '#dee0e1',
    userMessageText: '#dee0e1',
    thinkingText: '#808080',
    toolTitle: '#dee0e1',
    toolOutput: '#9da5a9',
    customMessageText: '#9da5a9',
    customMessageLabel: '#a798d7',
    error: '#ea7f81',
    warning: '#cd9a22',
    muted: '#9da5a9',
    dim: '#7e888e',
    mdHeading: '#cd9a22',
    mdLink: '#69add0',
    mdLinkUrl: '#9da5a9',
    mdCode: '#a798d7',
    mdCodeBlock: '#68b78d',
    mdCodeBlockBorder: '#9da5a9',
    mdQuote: '#9da5a9',
    mdQuoteBorder: '#9da5a9',
    mdHr: '#9da5a9',
    mdListBullet: '#a798d7',
    toolDiffAdded: '#68b78d',
    toolDiffRemoved: '#ea7f81',
    toolDiffContext: '#9da5a9',
    syntaxComment: '#9da5a9',
    syntaxKeyword: '#69add0',
    syntaxFunction: '#cd9a22',
    syntaxVariable: '#5db3ba',
    syntaxString: '#de8d5a',
    syntaxNumber: '#68b78d',
    syntaxType: '#a798d7',
    syntaxOperator: '#9da5a9',
    syntaxPunctuation: '#9da5a9',
  },
  workingFrames: animations,
  workingAnimation: 'pulse',
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
    (isPrintableLine(result.workingFrames) && result.workingFrames.length > 0) ||
      (isObject(result.workingFrames) &&
        Object.keys(result.workingFrames).length > 0 &&
        Object.entries(result.workingFrames).every(
          ([name, frames]) =>
            isPrintableLine(name) &&
            name.length > 0 &&
            isPrintableLine(frames) &&
            frames.length > 0,
        )),
    'workingFrames must be a non-empty printable string or an object of named sequences',
  );
  requireValid(
    isPrintableLine(result.workingAnimation) && result.workingAnimation.length > 0,
    'workingAnimation must be a non-empty name',
  );
  if (isObject(result.workingFrames)) {
    requireValid(
      Object.hasOwn(result.workingFrames, result.workingAnimation),
      'workingAnimation must name a sequence in workingFrames',
    );
  }
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
