import { paint } from './config.js';

// Split source fences, not terminal output. Markdown still owns inline formatting,
// wrapping and syntax highlighting within each section.
export function sections(source) {
  const result = [];
  let lines = [], fence = '', fenceLength = 0;
  const flush = code => {
    if (lines.length) result.push({ text: lines.join('\n'), code });
    lines = [];
  };
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    const char = trimmed[0];
    let count = 0;
    while (trimmed[count] === char && count < trimmed.length) count++;
    const opening = indent <= 3 && (char === '`' || char === '~') && count >= 3;
    if (!fence && opening) {
      flush(false); fence = char; fenceLength = count; lines.push(line);
    } else if (fence && char === fence && count >= fenceLength && !trimmed.slice(count).trim()) {
      lines.push(line); flush(true); fence = '';
    } else lines.push(line);
  }
  flush(Boolean(fence));
  return result;
}

export function patchTranscript(targets, getConfig, { visibleWidth, Markdown, Text, getMarkdownTheme }) {
  const undo = [];
  function prefix(component, role, width) {
    const config = getConfig();
    const available = width - visibleWidth(config.marker) - 1;
    if (available < 1) return [];
    const marker = paint(config.colors[role], config.marker);
    return component.render(available).map(line => marker + ' ' + line);
  }
  function markdown(source, role, instance, width, type, style) {
    const rows = [];
    const transform = (text, availableWidth) => {
      for (const fn of instance.markdownTransformers ?? []) {
        try { text = fn(text, { messageType: type, isStreaming: instance.isStreaming ?? false, availableWidth }); } catch { /* Match pi's transformer isolation. */ }
      }
      return text;
    };
    const available = Math.max(1, width - visibleWidth(getConfig().marker) - 1);
    for (const section of sections(transform(source, available))) {
      const component = new Markdown(section.text, 0, 0, instance.markdownTheme ?? getMarkdownTheme(), style, {
        preserveOrderedListMarkers: type === 'user', preserveBackslashEscapes: type === 'user',
      });
      rows.push(...prefix(component, section.code ? 'code' : role, width));
    }
    return rows;
  }
  try {
    for (const [Component, role] of targets) {
      const proto = Component.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'render');
      if (typeof proto.render !== 'function') throw new Error(`Unsupported ${role} renderer`);
      proto.render = function(width) {
        const rows = [];
        if (role === 'user') {
          rows.push(...markdown(this.text, role, this, width, 'user'));
        } else if (role === 'assistant') {
          const message = this.lastMessage;
          if (!message) return [];
          for (const block of message.content) {
            if (block.type === 'text' && block.text.trim()) rows.push(...markdown(block.text, role, this, width, 'assistant'));
            if (block.type === 'thinking' && block.thinking.trim()) {
              if (this.hideThinkingBlock) {
                if (!rows.length) rows.push(...prefix(new Text(this.hiddenThinkingLabel, 0, 0), role, width));
              } else rows.push(...markdown(block.thinking, role, this, width, 'assistant-thinking', { italic: true }));
            }
          }
          const hasTools = message.content.some(block => block.type === 'toolCall');
          let error;
          if (message.stopReason === 'length') error = 'Response was truncated before completion.';
          else if (!hasTools && message.stopReason === 'aborted') error = message.errorMessage || 'Operation aborted';
          else if (!hasTools && message.stopReason === 'error') error = message.errorMessage || 'Unknown error';
          if (error) rows.push(...prefix(new Text(error, 0, 0), 'error', width));
        } else {
          if (this.hideComponent) return [];
          const kind = this.result?.isError ? 'error' : 'tool';
          // Render the actual call/result component tree, not its padded Box.
          if (this.hasRendererDefinition()) {
            const container = this.getRenderShell() === 'self' ? this.selfRenderContainer : this.contentBox;
            for (const child of container.children) rows.push(...prefix(child, kind, width));
          } else {
            rows.push(...prefix(new Text(this.formatToolExecution(), 0, 0), kind, width));
          }
          // Image protocols must remain at native column zero, unmodified.
          for (const image of this.imageComponents ?? []) rows.push(...image.render(width));
        }
        return rows.length ? [...rows, '', ''] : [];
      };
      undo.push(() => descriptor ? Object.defineProperty(proto, 'render', descriptor) : delete proto.render);
    }
  } catch (error) { undo.reverse().forEach(fn => fn()); throw error; }
  return () => undo.splice(0).reverse().forEach(fn => fn());
}
