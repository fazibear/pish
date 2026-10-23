import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CustomEditor, UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, getMarkdownTheme, Theme, InteractiveMode, CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Markdown, Text, visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";
import { configure, paint } from "./config.js";
import { createDefaultConfig } from "./config-file.js";

import { patchTranscript } from "./transcript.js";
import { disableBackgrounds } from "./background.js";
import { patchUpdates } from "./updates.js";
import { patchPendingMessages } from "./pending.js";
import { patchStatusMessages } from "./status.js";
import { patchWidgetSpacing } from "./spacing.js";
import { createUsageClient } from "./usage.js";
import { patchTextColors } from "./text-colors.js";
import { configureCursor } from "./cursor.js";
import { rightPrompt, promptLayout, attachRightPrompt, workingIndicator } from "./right-prompt.js";
import { styleFakeCursor } from "./fake-cursor.js";

function installTranscript(getConfig: () => ReturnType<typeof configure>, colorText: (token: any, text: string) => string) {
  return patchTranscript([
    [UserMessageComponent, "user"],
    [AssistantMessageComponent, "assistant"],
    [ToolExecutionComponent, "tool"],
  ], getConfig, { visibleWidth, Markdown, Text, getMarkdownTheme, colorText });
}

export default function(pi: ExtensionAPI) {
  let config = configure();
  let restore: (() => void) | undefined;
  let restoreBackgrounds: (() => void) | undefined;
  let restoreTextColors: (() => void) | undefined;
  let restoreUpdates: (() => void) | undefined;
  let restorePending: (() => void) | undefined;
  let restoreStatus: (() => void) | undefined;
  let restoreSpacing: (() => void) | undefined;
  let cursorControl: { setBusy: (busy: boolean) => void; restore: () => void } | undefined;
  let applyCursor: (() => void) | undefined;
  let redraw: (() => void) | undefined;
  const usageClient = createUsageClient(pi, () => redraw?.());
  let gitBranch = "";
  let getUsageStatus = () => "";
  let workingTimer: ReturnType<typeof setInterval> | undefined;
  let workingStarted = 0;
  function stopWorkingTimer() {
    if (workingTimer) clearInterval(workingTimer);
    workingTimer = undefined;
  }
  function startWorkingTimer() {
    stopWorkingTimer();
    workingStarted = Date.now();
    workingTimer = setInterval(() => {
      if (config.workingIndicator === "spinner") redraw?.();
    }, 100);
  }
  const configPath = () => process.env.PISH_CONFIG || join(homedir(), CONFIG_DIR_NAME, "agent", "pish.json");
  async function load() {
    const path = configPath();
    try { config = configure(JSON.parse(await readFile(path, "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; config = configure(); }
  }
  pi.on("session_start", async (_, ctx) => {
    if (ctx.mode !== "tui") return;
    try {
      restoreSpacing = patchWidgetSpacing(InteractiveMode);
      ctx.ui.setWidget("pish-spacing", undefined);
    } catch (error) { ctx.ui.notify(`pish spacing: ${error}`, "warning"); }
    try {
      restoreStatus = patchStatusMessages(InteractiveMode, () => config, { Text, visibleWidth });
    } catch (error) { ctx.ui.notify(`pish status styling: ${error}`, "warning"); }
    ctx.ui.setWorkingVisible(false);
    if (!ctx.isIdle()) startWorkingTimer();
    restoreBackgrounds = disableBackgrounds(Theme);
    try {
      restorePending = patchPendingMessages(InteractiveMode, () => config, { Text, visibleWidth });
    } catch (error) { ctx.ui.notify(`pish queued-message styling: ${error}`, "warning"); }
    try {
      restoreUpdates = patchUpdates(InteractiveMode, () => config, { Text, Markdown, visibleWidth, getMarkdownTheme });
    } catch (error) { ctx.ui.notify(`pish update styling: ${error}`, "warning"); }
    restoreTextColors = patchTextColors(Theme, () => config);
    try { await load(); restore = await installTranscript(() => config, (token, text) => ctx.ui.theme.fg(token, text)); }
    catch (error) { ctx.ui.notify(`pish: ${error}`, "warning"); }
    if (config.rightPrompt.includes("{usage_")) usageClient.start(ctx);
    ctx.ui.setEditorComponent((tui, theme, keys) => {
      applyCursor = () => {
        cursorControl?.restore();
        cursorControl = configureCursor(tui, config);
        cursorControl.setBusy(!ctx.isIdle());
      };
      applyCursor();
      // Animation must not force a full-screen redraw: it disrupts scrollback
      // and paging while the agent is running.
      redraw = () => tui.requestRender();
      class ShellEditor extends CustomEditor {
        render(width: number) {
          const indicator = workingIndicator(config, !ctx.isIdle(), Math.max(0, Date.now() - workingStarted));
          const marker = indicator || config.marker;
          const prefix = paint(config.marerColors.input, marker) + " ";
          const layout = promptLayout(width, visibleWidth(marker) + 1,
            rightPrompt(config, ctx, pi, gitBranch, getUsageStatus(), usageClient.values()), { visibleWidth, truncateToWidth }, this.getText());
          const available = layout.editorWidth;
          if (available < 5) return [...super.render(width), "", ""];
          // Suppress borders at their styling hook, before output is rendered.
          const borderColor = this.borderColor;
          this.borderColor = () => "";
          try {
            const lines = super.render(available).filter(line => line !== "")
              .map(line => prefix + styleFakeCursor(line, config));
            return [...attachRightPrompt(lines, layout.right, width, config.marerColors.right, visibleWidth), "", ""];
          } finally { this.borderColor = borderColor; }
        }
      }
      return new ShellEditor(tui, theme, keys);
    });
    ctx.ui.setFooter((tui, _theme, data) => {
      getUsageStatus = () => data.getExtensionStatuses().get("usage") ?? "";
      const updateBranch = () => { gitBranch = data.getGitBranch() ?? ""; tui.requestRender(); };
      updateBranch();
      return {
        invalidate() {},
        dispose: data.onBranchChange(updateBranch),
        render() { return []; },
      };
    });
  });
  pi.on("model_select", (_, ctx) => {
    usageClient.stop();
    if (ctx.mode === "tui" && config.rightPrompt.includes("{usage_")) usageClient.start(ctx);
    redraw?.();
  });
  pi.on("thinking_level_select", () => { redraw?.(); });
  pi.on("agent_start", (_, ctx) => {
    if (ctx.mode !== "tui") return;
    cursorControl?.setBusy(true);
    startWorkingTimer(); redraw?.();
  });
  pi.on("agent_settled", () => {
    cursorControl?.setBusy(false);
    stopWorkingTimer(); redraw?.();
  });
  pi.on("turn_end", () => { redraw?.(); });
  pi.registerCommand("pish-usage", {
    description: "Refresh quota and show usage integration diagnostics",
    handler: async (_, ctx) => {
      if (ctx.mode !== "tui") return;
      usageClient.start(ctx);
      await usageClient.refresh();
      ctx.ui.notify(JSON.stringify(usageClient.diagnostic(), null, 2), "info");
    },
  });
  pi.registerCommand("pish-init", {
    description: "Create pish.json with all defaults without overwriting existing config",
    handler: async (_, ctx) => {
      const path = configPath();
      try {
        if (!await createDefaultConfig(path)) {
          ctx.ui.notify(`Config already exists; left unchanged: ${path}`, "info");
          return;
        }
        await load();
        applyCursor?.();
        redraw?.();
        ctx.ui.notify(`Created default configuration: ${path}`, "info");
      } catch (error) { ctx.ui.notify(`pish: ${error}`, "error"); }
    },
  });
  pi.registerCommand("pish-reload", {
    description: "Reload pish.json appearance settings",
    handler: async (_, ctx) => {
      try {
        await load();
        applyCursor?.();
        usageClient.stop();
        if (ctx.mode === "tui" && config.rightPrompt.includes("{usage_")) usageClient.start(ctx);
        redraw?.(); ctx.ui.notify("pish configuration reloaded", "info");
      }
      catch (error) { ctx.ui.notify(`pish: ${error}`, "error"); }
    },
  });
  pi.on("session_shutdown", (_, ctx) => {
    stopWorkingTimer();
    usageClient.stop();
    if (ctx.mode === "tui") ctx.ui.setWorkingVisible(true);
    redraw = undefined;
    getUsageStatus = () => "";
    restore?.(); restore = undefined;
    restoreBackgrounds?.(); restoreBackgrounds = undefined;
    restoreTextColors?.(); restoreTextColors = undefined;
    restoreUpdates?.(); restoreUpdates = undefined;
    restorePending?.(); restorePending = undefined;
    restoreStatus?.(); restoreStatus = undefined;
    restoreSpacing?.(); restoreSpacing = undefined;
    cursorControl?.restore(); cursorControl = undefined;
    applyCursor = undefined;
  });
}
