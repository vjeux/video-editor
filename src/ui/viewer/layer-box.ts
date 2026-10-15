import type { Clip, Project, TextClip } from "../../core/types";
import { layerSize, layoutText, type TextLayout } from "../../engine/compositor";

/** A layer's oriented bounding box, in project pixels. */
export interface Box {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const SCALE_STEP = 0.05;
const ROTATION_STEP = 15;

const measureCtx = new OffscreenCanvas(1, 1).getContext("2d");

/**
 * The layer's placed box in project pixels. Text depends on which fonts have
 * loaded, so callers pass `fontsVersion` to re-measure when that changes.
 */
export function boxOf(project: Project, clip: Clip, _fontsVersion = 0): Box | null {
  if (!measureCtx) return null;
  const size = layerSize(measureCtx, project, clip);
  const { x, y, scale, rotation } = clip.transform;
  return {
    cx: project.settings.width / 2 + x,
    cy: project.settings.height / 2 + y,
    width: size.width * scale,
    height: size.height * scale,
    rotation,
  };
}

/** A title's text layout (lines, padding, line height) in project pixels. */
export function textLayoutOf(clip: TextClip): TextLayout {
  if (!measureCtx) throw new Error("Text cannot be measured without a 2D canvas");
  return layoutText(measureCtx, clip);
}

export function contains(box: Box, px: number, py: number) {
  const a = (-box.rotation * Math.PI) / 180;
  const dx = px - box.cx;
  const dy = py - box.cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= box.width / 2 && Math.abs(ly) <= box.height / 2;
}

/** Snaps a centre offset to the frame centre and the frame edges. */
export function snapOffset(
  offset: Point,
  box: Box | null,
  frame: { width: number; height: number },
  threshold: number,
): Point {
  let { x, y } = offset;
  if (Math.abs(x) < threshold) x = 0;
  if (Math.abs(y) < threshold) y = 0;
  if (box) {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    if (Math.abs(x - halfW + frame.width / 2) < threshold) x = halfW - frame.width / 2;
    if (Math.abs(x + halfW - frame.width / 2) < threshold) x = frame.width / 2 - halfW;
    if (Math.abs(y - halfH + frame.height / 2) < threshold) y = halfH - frame.height / 2;
    if (Math.abs(y + halfH - frame.height / 2) < threshold) y = frame.height / 2 - halfH;
  }
  return { x, y };
}

/** Uniform scale from the ratio of pointer distances to the box centre. */
export function scaleAbout(box: Box, startScale: number, from: Point, to: Point, stepped: boolean) {
  const ratio =
    Math.hypot(to.x - box.cx, to.y - box.cy) /
    Math.max(1, Math.hypot(from.x - box.cx, from.y - box.cy));
  const raw = startScale * ratio;
  const scale = stepped ? Math.round(raw / SCALE_STEP) * SCALE_STEP : raw;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

/** Rotation in degrees, normalised to [-180, 180), from the pointer's sweep around the centre. */
export function rotateAbout(
  box: Box,
  startRotation: number,
  from: Point,
  to: Point,
  stepped: boolean,
) {
  const angle = (p: Point) => (Math.atan2(p.y - box.cy, p.x - box.cx) * 180) / Math.PI;
  const raw = startRotation + angle(to) - angle(from);
  const snapped = stepped ? Math.round(raw / ROTATION_STEP) * ROTATION_STEP : raw;
  const normalised = ((((snapped + 180) % 360) + 360) % 360) - 180;
  return Math.round(normalised * 10) / 10;
}
