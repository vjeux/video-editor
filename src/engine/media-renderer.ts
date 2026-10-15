import { maskPoints, mediaPlacement } from "../core/media-layout";
import type { FrameShadow, MediaAppearance } from "../core/types";
import type { Ctx2D, Drawable } from "./compositor";

export const hasMediaAppearance = (a: MediaAppearance) =>
  a.radius > 0 ||
  a.border !== null ||
  a.shadow !== null ||
  a.background !== null ||
  a.innerShadow !== null ||
  a.glow !== null ||
  a.feather > 0 ||
  a.mask.shape !== "rectangle";

function outline(width: number, height: number, a: MediaAppearance, inset = 0) {
  const path = new Path2D();
  const w = Math.max(0.01, width - inset * 2);
  const h = Math.max(0.01, height - inset * 2);
  if (a.mask.shape === "rectangle")
    path.roundRect(-w / 2, -h / 2, w, h, Math.max(0, Math.min(a.radius - inset, w / 2, h / 2)));
  else if (a.mask.shape === "circle" || a.mask.shape === "ellipse")
    path.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else {
    maskPoints(a.mask).forEach((p, i) => {
      if (i === 0) path.moveTo((p.x - 0.5) * w, (p.y - 0.5) * h);
      else path.lineTo((p.x - 0.5) * w, (p.y - 0.5) * h);
    });
    path.closePath();
  }
  return path;
}

function gradient(
  ctx: Ctx2D,
  width: number,
  height: number,
  from: string,
  to: string,
  angle: number,
) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const distance = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const fill = ctx.createLinearGradient(
    -dx * distance,
    -dy * distance,
    dx * distance,
    dy * distance,
  );
  fill.addColorStop(0, from);
  fill.addColorStop(1, to);
  return fill;
}

function drawShadow(
  ctx: Ctx2D,
  path: Path2D,
  width: number,
  height: number,
  shadow: FrameShadow,
  inner = false,
) {
  const matrix = ctx.getTransform();
  const extent =
    Math.max(Math.abs(shadow.x), Math.abs(shadow.y)) + shadow.blur * 3 + Math.max(width, height);
  const outside = new Path2D();
  outside.rect(-width / 2 - extent, -height / 2 - extent, width + extent * 2, height + extent * 2);
  outside.addPath(path);
  ctx.save();
  ctx.clip(inner ? path : outside, "evenodd");
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur * Math.hypot(matrix.a, matrix.b);
  ctx.shadowOffsetX = matrix.a * shadow.x + matrix.c * shadow.y;
  ctx.shadowOffsetY = matrix.b * shadow.x + matrix.d * shadow.y;
  ctx.fillStyle = "#000000";
  ctx.fill(inner ? outside : path, "evenodd");
  ctx.restore();
}

function drawFace(
  ctx: Ctx2D,
  frame: Drawable,
  width: number,
  height: number,
  a: MediaAppearance,
  path: Path2D,
) {
  ctx.save();
  ctx.clip(path, "evenodd");
  if (a.background) {
    const b = a.background;
    ctx.fillStyle =
      b.type === "linear" ? gradient(ctx, width, height, b.color, b.color2, b.angle) : b.color;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }
  const {
    source: s,
    viewport: v,
    picture: p,
  } = mediaPlacement(frame.width, frame.height, width, height, a);
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.width, v.height);
  ctx.clip();
  ctx.drawImage(frame, s.x, s.y, s.width, s.height, p.x, p.y, p.width, p.height);
  ctx.restore();
  if (a.innerShadow) drawShadow(ctx, path, width, height, a.innerShadow, true);
  if (a.border && a.border.width > 0) {
    const b = a.border;
    const w = Math.min(b.width, width / 2, height / 2);
    ctx.strokeStyle =
      b.style === "gradient" ? gradient(ctx, width, height, b.color, b.color2, b.angle) : b.color;
    ctx.lineJoin = "round";
    if (b.style === "double") {
      ctx.lineWidth = w / 3;
      ctx.stroke(outline(width, height, a, w / 6));
      ctx.stroke(outline(width, height, a, (w * 5) / 6));
    } else {
      // Clipping the outer half keeps every style inside the frame.
      ctx.lineWidth = w * 2;
      if (b.style === "dashed") ctx.setLineDash([w * 3, w * 2]);
      if (b.style === "dotted") {
        ctx.setLineDash([0, w * 2.5]);
        ctx.lineCap = "round";
        ctx.lineWidth = w;
        ctx.stroke(outline(width, height, a, w / 2));
      } else ctx.stroke(path);
    }
  }
  ctx.restore();
}

// Reused full-resolution buffers: no per-frame allocation during playback/export.
const featherBuffers: OffscreenCanvasRenderingContext2D[] = [];
function featherBuffer(slot: number, like: Ctx2D) {
  let ctx = featherBuffers[slot];
  if (!ctx) {
    ctx = new OffscreenCanvas(like.canvas.width, like.canvas.height).getContext("2d")!;
    featherBuffers[slot] = ctx;
  }
  if (ctx.canvas.width !== like.canvas.width || ctx.canvas.height !== like.canvas.height) {
    ctx.canvas.width = like.canvas.width;
    ctx.canvas.height = like.canvas.height;
  }
  ctx.resetTransform();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(like.getTransform());
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Draw a media frame at the origin, under the caller's clip transform. */
export function drawMediaFrame(
  ctx: Ctx2D,
  frame: Drawable,
  width: number,
  height: number,
  a: MediaAppearance,
) {
  if (width <= 0 || height <= 0) return;
  const path = outline(width, height, a);
  if (a.shadow) drawShadow(ctx, path, width, height, a.shadow);
  if (a.glow) drawShadow(ctx, path, width, height, { ...a.glow, x: 0, y: 0 });
  if (a.feather <= 0) {
    drawFace(ctx, frame, width, height, a, path);
    return;
  }
  const face = featherBuffer(0, ctx);
  const mask = featherBuffer(1, ctx);
  drawFace(face, frame, width, height, a, path);
  const feather = Math.min(a.feather, width / 4, height / 4);
  const matrix = ctx.getTransform();
  // Feather inward, leaving the selection frame and surrounding layers unchanged.
  mask.filter = `blur(${(feather * Math.hypot(matrix.a, matrix.b)) / 2}px)`;
  mask.fillStyle = "white";
  mask.fill(outline(width, height, a, feather), "evenodd");
  face.resetTransform();
  face.globalCompositeOperation = "destination-in";
  face.drawImage(mask.canvas, 0, 0);
  ctx.save();
  ctx.resetTransform();
  ctx.drawImage(face.canvas, 0, 0);
  ctx.restore();
}
