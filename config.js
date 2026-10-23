export const defaults = {
  marker: "▌",
  cursorShape: "bar",
  cursorBlink: false,
  fakeCursorEnabled: true,
  fakeCursorAlways: false,
  fakeCursorChar: " ",
  fakeCursorColor: "#808080",
  marerColors: { user: "#2456a6", assistant: "#27633b", thinking: "#505050", tool: "#663399", code: "#574080", error: "#a63333", input: "#2456a6", right: "#808080" },
  rightPrompt: "{model} · {thinking} · {context_used}/{context_limit} ({context_percent_used}) · {cwd}",
  textColors: {},
  workingIndicator: "spinner",
  workingText: "working",
};
export function configure(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Config must be an object");
  const result = { ...defaults, ...value, marerColors: { ...defaults.marerColors, ...value.marerColors } };
  if (!['default', 'block', 'underline', 'bar'].includes(result.cursorShape)) throw new Error('cursorShape must be default, block, underline, or bar');
  if (typeof result.cursorBlink !== 'boolean') throw new Error('cursorBlink must be boolean');
  if (typeof result.fakeCursorEnabled !== 'boolean') throw new Error('fakeCursorEnabled must be boolean');
  if (typeof result.fakeCursorAlways !== 'boolean') throw new Error('fakeCursorAlways must be boolean');
  if (typeof result.fakeCursorChar !== 'string' || !result.fakeCursorChar.length || result.fakeCursorChar.length > 8 || /[\x00-\x1f\x7f]/.test(result.fakeCursorChar)) throw new Error('fakeCursorChar must be 1–8 printable characters');
  if (typeof result.fakeCursorColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(result.fakeCursorColor)) throw new Error('fakeCursorColor must use #rrggbb');
  if (!result.textColors || typeof result.textColors !== 'object' || Array.isArray(result.textColors)) throw new Error('textColors must be an object');
  for (const color of Object.values(result.textColors)) if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('textColors must use #rrggbb');
  if (typeof result.marker !== "string" || !result.marker.length || result.marker.length > 8 || /[\x00-\x1f\x7f]/.test(result.marker)) throw new Error("marker must be 1–8 printable characters");
  if (typeof result.rightPrompt !== "string" || /[\x00-\x1f\x7f]/.test(result.rightPrompt)) throw new Error("rightPrompt must be a single printable line");
  if (!['spinner', 'text', 'none'].includes(result.workingIndicator)) throw new Error('workingIndicator must be spinner, text, or none');
  if (typeof result.workingText !== 'string' || /[\x00-\x1f\x7f]/.test(result.workingText)) throw new Error('workingText must be a single printable line');
  for (const color of Object.values(result.marerColors)) if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Colors must use #rrggbb");
  return result;
}
export function paint(color, text) {
  const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16));
  return `\x1b[38;2;${rgb.join(";")}m${text}\x1b[39m`;
}
export function template(format, values) {
  return format.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? "").replace(/[\x00-\x1f\x7f]/g, ""));
}
