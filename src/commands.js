import { createDefaultConfig } from './config-file.js';

export function registerCommands(
  pi,
  {
    configPath,
    load,
    applyCursor,
    redraw,
    refreshUsage,
    usageClient,
    getConfig,
    setAnimation,
    pickAnimation,
  },
) {
  function register(name, description, handler) {
    pi.registerCommand(name, {
      description,
      handler: async (args, ctx) => {
        try {
          await handler(ctx, args);
        } catch (error) {
          ctx.ui.notify(`pish: ${error}`, 'error');
        }
      },
    });
  }

  register('pish-indicator', 'Choose a named working animation', async (ctx, args = '') => {
    if (ctx.mode !== 'tui') return;
    const config = getConfig();
    const sequences =
      typeof config.workingFrames === 'string'
        ? { custom: config.workingFrames }
        : config.workingFrames;
    const names = Object.keys(sequences);
    let name = args.trim();
    if (!name) {
      const current = typeof config.workingFrames === 'string' ? 'custom' : config.workingAnimation;
      name = await pickAnimation(ctx, sequences, current);
      if (!name) return;
    }
    if (!Object.hasOwn(sequences, name)) {
      ctx.ui.notify(`Unknown animation: ${name}. Choose: ${names.join(', ')}`, 'error');
      return;
    }
    setAnimation(name);
    redraw();
    ctx.ui.notify(`Working animation: ${name} (this session)`, 'info');
  });

  register('pish-usage', 'Refresh quota and show usage integration diagnostics', async (ctx) => {
    if (ctx.mode !== 'tui') return;
    usageClient.start(ctx);
    await usageClient.refresh();
    ctx.ui.notify(JSON.stringify(usageClient.diagnostic(), null, 2), 'info');
  });

  register(
    'pish-init',
    'Create pish.json with all defaults without overwriting existing config',
    async (ctx) => {
      const path = configPath();
      if (!(await createDefaultConfig(path))) {
        ctx.ui.notify(`Config already exists; left unchanged: ${path}`, 'info');
        return;
      }
      await load();
      applyCursor();
      redraw();
      ctx.ui.notify(`Created default configuration: ${path}`, 'info');
    },
  );

  register('pish-reload', 'Reload pish.json appearance settings', async (ctx) => {
    await load();
    applyCursor();
    refreshUsage(ctx);
    redraw();
    ctx.ui.notify('pish configuration reloaded', 'info');
  });
}
