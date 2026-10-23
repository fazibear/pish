# pish

Shell-inspired terminal UI for pi. Colored full-height `▌` markers on user, assistant,
code, and tool rows; a borderless input; and a right-aligned status prompt.
Keeps pi's Markdown, syntax highlighting, tool expansion, and editor shortcuts.

## Install

```sh
pi install /Users/fazibear/dev/pish
```

Then `/reload`. Or try without installation: `pi -e ./index.ts`.

## Configure

Create `~/.pi/agent/pish.json` (or set `PISH_CONFIG` to another file):

```json
{
  "marker": "▌",
  "colors": {
    "user": "#87afff",
    "assistant": "#87d7af",
    "tool": "#d7af87",
    "code": "#af87ff",
    "error": "#ff5f5f",
    "input": "#87afff",
    "right": "#808080"
  },
  "rightPrompt": "{model} · {context_used}/{context_limit} ({context_percent_used}) · {cwd}"
}
```

The working indicator replaces the input marker while busy, instead of appearing
in the right prompt or a separate row. Choose `"workingIndicator": "spinner"`
(default), `"text"`, or `"none"`. For text mode set `"workingText": "working"`.
The normal marker returns when idle. The indicator remains visible with long input.

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
