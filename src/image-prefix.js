import { styleBlockLine } from './rendering.js';

const IMAGE = /\x1b_G|\x1b\]1337;File=/;

// pi recognizes blank continuation rows as reserved image space. Visible text
// there makes its renderer clear those rows AFTER drawing the Kitty image.
// Draw the bars from the protocol-bearing row, leaving the reservation intact.
export function prefixImage(image, width, config, role, visibleWidth) {
  const available = width - visibleWidth(config.marker) - 1;
  if (available < 1) return [];
  const rows = image.render(available);
  const anchor = rows.findIndex((line) => IMAGE.test(line));
  if (anchor < 0) return rows.map((line) => styleBlockLine(config, role, line));
  const bar = styleBlockLine(config, role, '');
  let bars = '\r';
  if (anchor > 0) bars += `\x1b[${anchor}A`;
  for (let row = 0; row < rows.length; row++) {
    if (row > 0) bars += '\x1b[1B\r';
    bars += bar;
  }
  const returnRows = rows.length - 1 - anchor;
  if (returnRows > 0) bars += `\x1b[${returnRows}A`;
  bars += '\r';
  // Preserve the native payload, dimensions and cursor-up sequence. The final
  // prefix places the image to the right of the bars on either protocol.
  return rows.map((line, index) =>
    index === anchor ? bars + styleBlockLine(config, role, line) : line,
  );
}
