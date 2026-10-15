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
  layout: { padding: number; lineHeight: number },
  style: { fontSize: number; letterSpacing: number },
  scale: { display: number; clip: number },
): TextEditFrame {
  const type = scale.display * scale.clip;
  return {
    left: (box.cx - box.width / 2) * scale.display,
    top: (box.cy - box.height / 2) * scale.display,
    width: box.width * scale.display,
    height: box.height * scale.display,
    rotation: box.rotation,
    fontSize: style.fontSize * type,
    lineHeight: layout.lineHeight * type,
    padding: layout.padding * type,
    letterSpacing: style.letterSpacing * type,
  };
}
