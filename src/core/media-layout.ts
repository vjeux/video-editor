import { containSize } from "./layout";
import type { MaskPoint, MediaAppearance } from "./types";

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The outer selection frame follows the crop/aspect; padding stays inside it. */
export function mediaFrameSize(
  sourceWidth: number,
  sourceHeight: number,
  projectWidth: number,
  projectHeight: number,
  appearance: MediaAppearance,
) {
  const { crop, mask, aspect } = appearance;
  const ratio =
    mask.shape === "circle"
      ? 1
      : (aspect ??
        (sourceWidth * (1 - crop.left - crop.right)) /
          (sourceHeight * (1 - crop.top - crop.bottom)));
  return containSize(ratio, 1, projectWidth, projectHeight);
}

/** Source crop, padded viewport and fitted picture all share clip-local coordinates. */
export function mediaPlacement(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  appearance: MediaAppearance,
) {
  const { crop, padding, fit, position } = appearance;
  const source: FrameRect = {
    x: sourceWidth * crop.left,
    y: sourceHeight * crop.top,
    width: sourceWidth * (1 - crop.left - crop.right),
    height: sourceHeight * (1 - crop.top - crop.bottom),
  };
  // Keep a positive viewport even when imported padding exceeds the frame size.
  const px = Math.min(1, Math.max(0, width - 1) / Math.max(1, padding.left + padding.right));
  const py = Math.min(1, Math.max(0, height - 1) / Math.max(1, padding.top + padding.bottom));
  const viewport: FrameRect = {
    x: -width / 2 + padding.left * px,
    y: -height / 2 + padding.top * py,
    width: width - (padding.left + padding.right) * px,
    height: height - (padding.top + padding.bottom) * py,
  };
  const ratio = (fit === "cover" ? Math.max : Math.min)(
    viewport.width / source.width,
    viewport.height / source.height,
  );
  const picture: FrameRect = {
    x: viewport.x + (viewport.width - source.width * ratio) * position.x,
    y: viewport.y + (viewport.height - source.height * ratio) * position.y,
    width: source.width * ratio,
    height: source.height * ratio,
  };
  return { source, viewport, picture };
}

export function maskPoints(mask: MediaAppearance["mask"]): readonly MaskPoint[] {
  if (mask.shape === "diamond")
    return [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
    ];
  if (mask.shape === "hexagon")
    return [
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 1 },
      { x: 0.25, y: 1 },
      { x: 0, y: 0.5 },
    ];
  return mask.points;
}

/** Hit testing excludes the empty corners of masks, even after rotation/scale. */
export function insideMediaMask(
  x: number,
  y: number,
  width: number,
  height: number,
  appearance: MediaAppearance,
) {
  if (Math.abs(x) > width / 2 || Math.abs(y) > height / 2) return false;
  const { shape } = appearance.mask;
  if (shape === "circle" || shape === "ellipse")
    return (x / (width / 2)) ** 2 + (y / (height / 2)) ** 2 <= 1;
  if (shape === "rectangle") {
    const radius = Math.min(appearance.radius, width / 2, height / 2);
    const dx = Math.max(0, Math.abs(x) - (width / 2 - radius));
    const dy = Math.max(0, Math.abs(y) - (height / 2 - radius));
    return dx * dx + dy * dy <= radius * radius;
  }
  const points = maskPoints(appearance.mask);
  const px = x / width + 0.5;
  const py = y / height + 0.5;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
