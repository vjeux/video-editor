import type { Box } from "./layer-box";

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

export function textEditFrame(
  _box: Box,
  _layout: { padding: number; lineHeight: number },
  _style: { fontSize: number; letterSpacing: number },
  _scale: { display: number; clip: number },
): TextEditFrame {
  throw new Error("Not implemented");
}
