import type { Box } from "./layer-box";

/** Where and at what size the inline editor sits, in display pixels. */
export interface TextEditFrame {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
  lineHeight: number;
  padding: number;
  letterSpacing: number;
}

/**
 * Maps a title's placed box and text layout onto the monitor so the editor's
 * glyphs (and so its caret) line up with the canvas: `display` is display
 * pixels per project pixel, `clip` the title's own transform scale.
 */
export function textEditFrame(
  box: Box,
  layout: { width: number; height: number; padding: number; lineHeight: number },
  style: { fontSize: number; letterSpacing: number },
  scale: { display: number; clip: number },
): TextEditFrame {
  const type = scale.display * scale.clip;
  const width = layout.width * type;
  const height = layout.height * type;
  return {
    left: box.cx * scale.display - width / 2,
    top: box.cy * scale.display - height / 2,
    width,
    height,
    rotation: box.rotation,
    fontSize: style.fontSize * type,
    lineHeight: layout.lineHeight * type,
    padding: layout.padding * type,
    letterSpacing: style.letterSpacing * type,
  };
}
