# pish

Shell-inspired terminal UI for pi. Colored full-height `▌` markers on user, assistant,
code, and tool rows; a borderless input; and a right-aligned status prompt.
Keeps pi's Markdown, syntax highlighting, tool expansion, and editor shortcuts.

## Install

```sh
pi install git:github.com/fazibear/pish
```

Then restart pi. To try without installing:

```sh
pi -e git:github.com/fazibear/pish
```

## Configure

Create `~/.pi/agent/pish.json` (or set `PISH_CONFIG` to another file):

```json
{
  "marker": "▌",
  "marerColors": {
    "user": "#2456a6",
    "assistant": "#27633b",
    "thinking": "#505050",
    "tool": "#663399",
    "code": "#574080",
    "error": "#a63333",
    "input": "#2456a6",
    "right": "#808080"
  },
  "rightPrompt": "{model} · {thinking} · {context_used}/{context_limit} ({context_percent_used}) · {cwd}"
}
```

The working indicator replaces the input marker while busy, instead of appearing
in the right prompt or a separate row. Choose `"workingIndicator": "spinner"`
(default), `"text"`, or `"none"`. For text mode set `"workingText": "working"`.
The normal marker returns when idle. The indicator remains visible with long input.

### Cursor

```json
{ "cursorShape": "bar", "cursorBlink": false, "fakeCursorAlways": false }
```

Shapes: `bar` (default), `block`, `underline`, or `default` (pi's normal cursor).
Set `cursorBlink` to `true` for blinking.
Set `fakeCursorAlways` to `true` to always use pish's fake underline cursor and
keep hardware cursor hidden in both idle and working states. The current letter
is preserved and underlined. At end of input an underlined space is used
(`fakeCursorChar: " "`). The cursor inherits the surrounding text color without
changing it. `fakeCursorEnabled` can disable custom fake-cursor styling.
Requires terminal support. Changes apply with `/pish-reload`; shutdown restores
the terminal's default cursor shape.

### Text colors

`marerColors` controls markers. `textColors` overrides pi foreground theme tokens:

```json
{
  "textColors": {
    "text": "#dddddd",
    "userMessageText": "#87afff",
    "thinkingText": "#808080",
    "toolTitle": "#d7af87",
    "toolOutput": "#cccccc",
    "error": "#ff5f5f",
    "warning": "#ffd787",
    "customMessageText": "#dddddd",
    "customMessageLabel": "#af87ff"
  }
}
```

Any pi foreground token can be overridden, including `mdCode`, `mdCodeBlock`,
`syntaxKeyword`, `syntaxString`, and diff tokens. Omitted tokens inherit the active
theme. Theme-level overrides also affect menus and other pi components using those
tokens. Markdown and syntax-specific colors still take precedence over base text.
Use `/pish-reload` to apply changes; bars remain independently configurable.

All fields are optional. Colors use RGB hex. `/pish-reload` rereads settings.
Set `rightPrompt` to `""` to hide it.

With `@narumitw/pi-usage` installed, include `{usage}` to display its status:

```json
{ "rightPrompt": "{model} · {usage}" }
```

For granular structured quotas, use placeholders such as:

```json
{ "rightPrompt": "{model} · 5h {usage_5h_percent_left} · 7d {usage_7d_percent_left} · ctx {context_percent_used}" }
```

`{usage_provider}` names the provider. Each bucket exposes
`{usage_<key>_label}`, `_used`, `_left`, `_limit`, `_unit`, `_percent_used`,
`_percent_left`, `_reset` (countdown, e.g. `2h 15m` or `3d 4h`), and
`_reset_at` (ISO timestamp). Keys are normalized bucket IDs;
window aliases such as `5h` and `7d` are also provided when the provider supplies
a window duration. Missing/expired reports produce empty placeholders; unknown
measurements within a report display `?`. Fields depend on provider support.
Structured quotas use pi-usage's read-only API, refreshing every 60 seconds only
when a `usage_` placeholder is configured. Polling stops on shutdown.

For the original combined `{usage}` field, enable the statusline display in pi-usage's settings. If no usage status is
published, the placeholder is empty. Provider polling remains owned by pi-usage.

Placeholders: `{usage}`, `{model}`, `{provider}`, `{cwd}`, `{dir}`, `{branch}`,
`{context_used}`, `{context_limit}`, `{context_left}`, `{context_percent_used}`,
`{context_percent_left}`, `{thinking}`, `{status}`.
Limits are **context-window tokens**, not subscription quotas or rate limits
(which pi does not expose). Unknown usage displays `?`.

The right prompt sits on the first input line, aligned to the terminal's right
edge. Input and completions reserve its space. Long prompts are truncated to
half the terminal width; on narrow terminals the right prompt is hidden.

## Compatibility

Targets pi 0.84.2 (`@earendil-works` distribution). Transcript styling uses
component render-method adapters because pi has no public full-transcript
layout hook. Messages are built from source using Markdown components; tools
compose their call/result children directly, without the default Box. No rendered
ANSI output is rewritten or cleaned up with regex. Patches are restored on shutdown/reload; unsupported versions
produce a warning. Image rows retain native rendering at column zero. Other extensions
replacing the editor/footer may conflict. Code markers follow fenced blocks;
tool output uses the tool color unless it contains fences. This is terminal
styling only: session messages and model context are unchanged.

## Tests

```sh
npm test
```
