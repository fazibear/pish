export const defaults = {
  marker: "▌",
  colors: { user: "#87afff", assistant: "#87d7af", tool: "#d7af87", code: "#af87ff", error: "#ff5f5f", input: "#87afff", right: "#808080" },
  rightPrompt: "{model} · {context_used}/{context_limit} ({context_percent_used}) · {cwd}",
  workingIndicator: "spinner",
  workingText: "working",
};
export function configure(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Config must be an object");
  const result = { ...defaults, ...value, colors: { ...defaults.colors, ...value.colors } };
  if (typeof result.marker !== "string" || !result.marker.length || result.marker.length > 8 || /[\x00-\x1f\x7f]/.test(result.marker)) throw new Error("marker must be 1–8 printable characters");
  if (typeof result.rightPrompt !== "string" || /[\x00-\x1f\x7f]/.test(result.rightPrompt)) throw new Error("rightPrompt must be a single printable line");
  if (!['spinner', 'text', 'none'].includes(result.workingIndicator)) throw new Error('workingIndicator must be spinner, text, or none');
  if (typeof result.workingText !== 'string' || /[\x00-\x1f\x7f]/.test(result.workingText)) throw new Error('workingText must be a single printable line');
  for (const color of Object.values(result.colors)) if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Colors must use #rrggbb");
  return result;
}
export function paint(color, text) {
  const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16));
  return `\x1b[38;2;${rgb.join(";")}m${text}\x1b[39m`;
}
export function template(format, values) {
  return format.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? "").replace(/[\x00-\x1f\x7f]/g, ""));
}
