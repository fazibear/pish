import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  AssistantMessageComponent,
  CONFIG_DIR_NAME,
  CustomEditor,
  getMarkdownTheme,
  InteractiveMode,
  Theme,
  ToolExecutionComponent,
  UserMessageComponent,
} from '@earendil-works/pi-coding-agent';
import { Markdown, Spacer, Text, truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { disableBackgrounds } from './background.js';
import { registerCommands } from './commands.js';
import { configure } from './config.js';
import { loadConfig } from './config-file.js';
import { configureCursor } from './cursor.js';
import { createShellEditor } from './editor.js';
import { patchPendingMessages } from './pending.js';
import { patchUserMessageSpacing, patchWidgetSpacing } from './spacing.js';
import { patchStatusMessages } from './status.js';
import { patchTextColors } from './text-colors.js';
import { patchTranscript } from './transcript.js';
import { patchUpdates } from './updates.js';
import { createUsageClient } from './usage.js';

function installTranscript(getConfig, colorText) {
  return patchTranscript(
    [
      [UserMessageComponent, 'user'],
      [AssistantMessageComponent, 'assistant'],
      [ToolExecutionComponent, 'tool'],
    ],
    getConfig,
    { visibleWidth, Markdown, Text, getMarkdownTheme, colorText },
  );
}

export default function (pi) {
  let config = configure();
  const restorers = [];
  function installPatch(ctx, label, install) {
    try {
      restorers.push(install());
    } catch (error) {
      ctx.ui.notify(`pish ${label}: ${error}`, 'warning');
    }
  }
  let cursorControl;
  let applyCursor;
  let redraw;
  const usageClient = createUsageClient(pi, () => redraw?.());
  function refreshUsage(ctx) {
    usageClient.stop();
    if (ctx.mode === 'tui' && config.rightPrompt.includes('{usage_')) usageClient.start(ctx);
  }
  let gitBranch = '';
  let getUsageStatus = () => '';
  let workingTimer;
  let workingStarted = 0;
  function stopWorkingTimer() {
    if (workingTimer) clearInterval(workingTimer);
    workingTimer = undefined;
  }
  function startWorkingTimer() {
    stopWorkingTimer();
    workingStarted = Date.now();
    workingTimer = setInterval(() => {
      redraw?.();
    }, 100);
  }
  const configPath = () =>
    process.env.PISH_CONFIG || join(homedir(), CONFIG_DIR_NAME, 'agent', 'pish.json');
  async function load() {
    config = await loadConfig(configPath());
  }
  pi.on('session_start', async (_, ctx) => {
    if (ctx.mode !== 'tui') return;
    installPatch(ctx, 'widget spacing', () => patchWidgetSpacing(InteractiveMode));
    installPatch(ctx, 'message spacing', () => patchUserMessageSpacing(InteractiveMode, Spacer));
    ctx.ui.setWidget('pish-spacing', undefined);
    installPatch(ctx, 'status styling', () =>
      patchStatusMessages(InteractiveMode, () => config, { Text, visibleWidth }),
    );
    ctx.ui.setWorkingVisible(false);
    if (!ctx.isIdle()) startWorkingTimer();
    installPatch(ctx, 'backgrounds', () => disableBackgrounds(Theme));
    installPatch(ctx, 'queued-message styling', () =>
      patchPendingMessages(InteractiveMode, () => config, { Text, visibleWidth }),
    );
    installPatch(ctx, 'update styling', () =>
      patchUpdates(InteractiveMode, () => config, {
        Text,
        Markdown,
        visibleWidth,
        getMarkdownTheme,
      }),
    );
    installPatch(ctx, 'text colors', () => patchTextColors(Theme, () => config));
    try {
      await load();
    } catch (error) {
      ctx.ui.notify(`pish: ${error}`, 'warning');
    }
    installPatch(ctx, 'transcript', () =>
      installTranscript(
        () => config,
        (token, text) => ctx.ui.theme.fg(token, text),
      ),
    );
    if (config.rightPrompt.includes('{usage_')) usageClient.start(ctx);
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
      return createShellEditor(CustomEditor, {
        tui,
        theme,
        keys,
        getConfig: () => config,
        visibleWidth,
        truncateToWidth,
        getPromptState: () => ({
          busy: !ctx.isIdle(),
          elapsed: Math.max(0, Date.now() - workingStarted),
          ctx,
          pi,
          branch: gitBranch,
          usageStatus: getUsageStatus(),
          usageValues: usageClient.values(),
        }),
      });
    });
    ctx.ui.setFooter((tui, _theme, data) => {
      getUsageStatus = () => data.getExtensionStatuses().get('usage') ?? '';
      const updateBranch = () => {
        gitBranch = data.getGitBranch() ?? '';
        tui.requestRender();
      };
      updateBranch();
      return {
        invalidate() {},
        dispose: data.onBranchChange(updateBranch),
        render() {
          return [];
        },
      };
    });
  });
  pi.on('model_select', (_, ctx) => {
    refreshUsage(ctx);
    redraw?.();
  });
  pi.on('thinking_level_select', () => {
    redraw?.();
  });
  pi.on('agent_start', (_, ctx) => {
    if (ctx.mode !== 'tui') return;
    cursorControl?.setBusy(true);
    startWorkingTimer();
    redraw?.();
  });
  pi.on('agent_settled', () => {
    cursorControl?.setBusy(false);
    stopWorkingTimer();
    redraw?.();
  });
  pi.on('turn_end', () => {
    redraw?.();
  });
  registerCommands(pi, {
    configPath,
    load,
    refreshUsage,
    usageClient,
    applyCursor: () => applyCursor?.(),
    redraw: () => redraw?.(),
  });
  pi.on('session_shutdown', (_, ctx) => {
    stopWorkingTimer();
    usageClient.stop();
    if (ctx.mode === 'tui') ctx.ui.setWorkingVisible(true);
    redraw = undefined;
    getUsageStatus = () => '';
    for (const restore of restorers.splice(0).reverse()) restore();
    cursorControl?.restore();
    cursorControl = undefined;
    applyCursor = undefined;
  });
}
