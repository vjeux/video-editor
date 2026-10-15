import { clipOpacityAt, textAnimationState } from "../core/animation";
import { containSize } from "../core/layout";
import { sourceTimeAt, visualLayers } from "../core/timeline";
import type { Clip, MediaClip, Project, TextClip } from "../core/types";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Drawable = HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Resolves the decoded picture for a media clip at a source time. */
export type FrameSource = (clip: MediaClip, sourceTime: number) => Drawable | null;

const LINE_HEIGHT = 1.15;
const BOX_PADDING = 0.35;

export interface TextLayout {
  lines: string[];
  lineHeight: number;
  width: number;
  height: number;
  padding: number;
}

export const fontFor = (clip: TextClip) =>
  `${clip.style.fontWeight} ${clip.style.fontSize}px "${clip.style.fontFamily}", system-ui, sans-serif`;

function applyTextStyle(ctx: Ctx2D, clip: TextClip) {
  ctx.font = fontFor(clip);
  ctx.letterSpacing = `${clip.style.letterSpacing}px`;
  ctx.textBaseline = "middle";
}

export function layoutText(ctx: Ctx2D, clip: TextClip): TextLayout {
  ctx.save();
  applyTextStyle(ctx, clip);
  const lines = clip.text.split("\n");
  const lineHeight = clip.style.fontSize * LINE_HEIGHT;
  const textWidth = Math.max(1, ...lines.map((line) => ctx.measureText(line).width));
  ctx.restore();
  const padding = clip.style.background ? clip.style.fontSize * BOX_PADDING : 0;
  return {
    lines,
    lineHeight,
    width: textWidth + padding * 2,
    height: lines.length * lineHeight + padding * 2,
    padding,
  };
}

/** Unscaled, unrotated size of a layer in project pixels. */
export function layerSize(
  ctx: Ctx2D,
  project: Project,
  clip: Clip,
): { width: number; height: number } {
  if (clip.type === "text") return layoutText(ctx, clip);
  const asset = project.assets[clip.assetId];
  if (!asset || !asset.width) return { width: 0, height: 0 };
  return containSize(asset.width, asset.height, project.settings.width, project.settings.height);
}

function drawMedia(ctx: Ctx2D, project: Project, clip: MediaClip, t: number, frames: FrameSource) {
  const frame = frames(clip, sourceTimeAt(clip, t));
  if (!frame) return;
  const { width, height } = containSize(
    frame.width,
    frame.height,
    project.settings.width,
    project.settings.height,
  );
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
}

function drawText(ctx: Ctx2D, clip: TextClip, t: number) {
  const layout = layoutText(ctx, clip);
  const anim = textAnimationState(clip, t);
  const { style } = clip;

  ctx.globalAlpha *= anim.opacity;
  if (anim.blur > 0) ctx.filter = `blur(${anim.blur}px)`;
  ctx.translate(0, anim.offsetY);

  if (style.background) {
    ctx.fillStyle = style.background;
    ctx.beginPath();
    ctx.roundRect(
      -layout.width / 2,
      -layout.height / 2,
      layout.width,
      layout.height,
      style.fontSize * 0.18,
    );
    ctx.fill();
  }

  applyTextStyle(ctx, clip);
  ctx.textAlign = style.align;
  ctx.fillStyle = style.color;
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = style.fontSize * 0.2;
  ctx.shadowOffsetY = style.fontSize * 0.02;

  const inner = layout.width / 2 - layout.padding;
  const x = { left: -inner, center: 0, right: inner }[style.align];
  let remaining = anim.visibleChars;
  layout.lines.forEach((line, i) => {
    const shown = line.slice(0, Math.max(0, remaining));
    remaining -= line.length + 1;
    const y = -layout.height / 2 + layout.padding + layout.lineHeight * (i + 0.5);
    if (shown) ctx.fillText(shown, x, y);
  });
}

/** Composites every visible layer at `t` into a canvas of any size (scaled from project pixels). */
export function renderFrame(ctx: Ctx2D, project: Project, t: number, frames: FrameSource) {
  const { width, height, background } = project.settings;
  const scale = ctx.canvas.width / width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";

  for (const clip of visualLayers(project, t)) {
    const opacity = clipOpacityAt(clip, t);
    if (opacity <= 0) continue;
    const { x, y, scale: s, rotation } = clip.transform;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(s, s);
    if (clip.type === "text") drawText(ctx, clip, t);
    else drawMedia(ctx, project, clip, t, frames);
    ctx.restore();
  }
}
