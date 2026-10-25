import { styleBlockLine } from './rendering.js';
import { prefixImage } from './image-prefix.js';
import { sections } from './sections.js';

export { sections } from './sections.js';

const TEXT_TOKENS = {
  user: 'userMessageText',
  'assistant-thinking': 'thinkingText',
};

function responseError(message) {
  if (message.stopReason === 'length') return 'Response was truncated before completion.';
  if (message.content.some((block) => block.type === 'toolCall')) return;
  if (message.stopReason === 'aborted') return message.errorMessage || 'Operation aborted';
  if (message.stopReason === 'error') return message.errorMessage || 'Unknown error';
}

function transformMarkdown(source, instance, messageType, availableWidth) {
  for (const transform of instance.markdownTransformers ?? []) {
    try {
      source = transform(source, {
        messageType,
        isStreaming: instance.isStreaming ?? false,
        availableWidth,
      });
    } catch {
      // Match pi's transformer isolation.
    }
  }
  return source;
}

export function patchTranscript(
  targets,
  getConfig,
  {
    visibleWidth,
    Markdown,
    Text,
    Box,
    Container,
    Image,
    getMarkdownTheme,
    colorText = (_token, text) => text,
  },
) {
  const undo = [];
  const restore = () =>
    undo
      .splice(0)
      .reverse()
      .forEach((fn) => {
        fn();
      });

  function prefix(component, role, width) {
    if (Image && component instanceof Image)
      return prefixImage(component, width, getConfig(), role, visibleWidth);
    if (
      (Box && component.constructor === Box) ||
      (Container && component.constructor === Container)
    ) {
      return component.children.flatMap((child) => prefix(child, role, width));
    }
    const config = getConfig();
    const available = width - visibleWidth(config.marker) - 1;
    if (available < 1) return [];
    return component.render(available).map((line) => styleBlockLine(config, role, line));
  }

  function markdown(source, role, instance, width, type, style) {
    const rows = [];
    const available = Math.max(1, width - visibleWidth(getConfig().marker) - 1);
    const transformed = transformMarkdown(source, instance, type, available);
    for (const section of sections(transformed)) {
      const component = new Markdown(
        section.text,
        0,
        0,
        instance.markdownTheme ?? getMarkdownTheme(),
        {
          ...style,
          color: (text) => colorText(TEXT_TOKENS[type] ?? 'text', text),
        },
        {
          preserveOrderedListMarkers: type === 'user',
          preserveBackslashEscapes: type === 'user',
        },
      );
      const markerRole = type === 'assistant-thinking' ? 'thinking' : section.code ? 'code' : role;
      rows.push(...prefix(component, markerRole, width));
    }
    return rows;
  }

  function assistant(instance, width) {
    const message = instance.lastMessage;
    if (!message) return [];
    const rows = [];
    let previousBlockType;
    for (const block of message.content) {
      const content =
        block.type === 'text' ? block.text : block.type === 'thinking' ? block.thinking : '';
      if (!content.trim()) continue;
      if (previousBlockType === 'thinking' && block.type === 'text' && rows.length)
        rows.push('', '');
      if (block.type === 'text') {
        rows.push(...markdown(block.text, 'assistant', instance, width, 'assistant'));
      } else if (instance.hideThinkingBlock) {
        if (!rows.length) {
          const label = new Text(colorText('thinkingText', instance.hiddenThinkingLabel), 0, 0);
          rows.push(...prefix(label, 'thinking', width));
        }
      } else {
        rows.push(
          ...markdown(block.thinking, 'assistant', instance, width, 'assistant-thinking', {
            italic: true,
          }),
        );
      }
      previousBlockType = block.type;
    }
    const error = responseError(message);
    if (error) rows.push(...prefix(new Text(colorText('error', error), 0, 0), 'error', width));
    return rows;
  }

  function tool(instance, width) {
    if (instance.hideComponent) return [];
    const rows = [];
    const role = instance.result?.isError ? 'error' : 'tool';
    // Render the actual call/result component tree, not its padded Box.
    if (instance.hasRendererDefinition()) {
      const container =
        instance.getRenderShell() === 'self' ? instance.selfRenderContainer : instance.contentBox;
      for (const child of container.children) rows.push(...prefix(child, role, width));
    } else {
      rows.push(...prefix(new Text(instance.formatToolExecution(), 0, 0), role, width));
    }
    for (const image of instance.imageComponents ?? [])
      rows.push(...prefixImage(image, width, getConfig(), role, visibleWidth));
    return rows;
  }

  const renderers = {
    user: (instance, width) => markdown(instance.text, 'user', instance, width, 'user'),
    assistant,
    bash: (instance, width) =>
      prefix(instance.contentContainer, instance.status === 'error' ? 'bashError' : 'bash', width),
    custom: (instance, width) => prefix(instance.customComponent ?? instance.box, 'custom', width),
    entry: (instance, width) =>
      instance.customComponent ? prefix(instance.customComponent, 'entry', width) : [],
    skill: (instance, width) => instance.children.flatMap((child) => prefix(child, 'skill', width)),
    summary: (instance, width) =>
      instance.children.flatMap((child) => prefix(child, 'summary', width)),
    compaction: (instance, width) => {
      // Keep pi's collapsed/expanded content and interaction regions, not its padded Box.
      return instance.children.flatMap((child) => prefix(child, 'compaction', width));
    },
  };
  try {
    for (const [Component, role] of targets) {
      const proto = Component.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'render');
      if (typeof proto.render !== 'function') throw new Error(`Unsupported ${role} renderer`);
      const render = renderers[role] ?? tool;
      proto.render = function (width) {
        const rows = render(this, width);
        return rows.length ? [...rows, '', ''] : [];
      };
      undo.push(() =>
        descriptor ? Object.defineProperty(proto, 'render', descriptor) : delete proto.render,
      );
    }
  } catch (error) {
    restore();
    throw error;
  }
  return restore;
}
