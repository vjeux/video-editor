export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export function placePopover(
  _anchor: Rect,
  _size: Size,
  _viewport: Size,
  _side: "below" | "right",
  _gap = 4,
): { left: number; top: number } {
  throw new Error("Not implemented");
}
