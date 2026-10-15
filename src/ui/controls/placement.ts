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

/** Breathing room kept between a popover and the viewport edge. */
const EDGE = 8;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Places a popover next to `anchor`: `below` (dropdowns, menus at a point)
 * or to the `right` (submenus). It flips to the opposite side when it would
 * overflow there and the other side has room, then clamps into the viewport.
 */
export function placePopover(
  anchor: Rect,
  size: Size,
  viewport: Size,
  side: "below" | "right",
  gap = 4,
): { left: number; top: number } {
  const fits = (start: number, length: number, limit: number) =>
    start >= EDGE && start + length <= limit - EDGE;
  const along = (start: number, length: number, limit: number) =>
    clamp(start, EDGE, limit - length - EDGE);

  if (side === "below") {
    const below = anchor.y + anchor.height + gap;
    const above = anchor.y - gap - size.height;
    const top =
      !fits(below, size.height, viewport.height) && fits(above, size.height, viewport.height)
        ? above
        : along(below, size.height, viewport.height);
    return { left: along(anchor.x, size.width, viewport.width), top };
  }
  const right = anchor.x + anchor.width + gap;
  const left = anchor.x - gap - size.width;
  return {
    left:
      !fits(right, size.width, viewport.width) && fits(left, size.width, viewport.width)
        ? left
        : along(right, size.width, viewport.width),
    top: along(anchor.y, size.height, viewport.height),
  };
}
