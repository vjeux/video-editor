import { clipOpacityAt } from "../core/animation";
import { animationStateAt, IDENTITY_MOTION, type MotionDelta } from "../core/clip-animations";
import { defaultParams } from "../core/effects";
import { layersAt, type Layer } from "../core/layers";
import { containSize } from "../core/layout";
import { clipEnd, frameSourceTime } from "../core/timeline";
import type { Clip, EffectDefinition, MediaClip, Project, TextClip } from "../core/types";
import type { GpuEffects, GpuPass } from "./gpu";
import { drawText, textBounds } from "./text-renderer";

export { fontFor, layoutText, type TextLayout } from "./text-renderer";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Drawable = HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Resolves the decoded picture for a media clip at a source time. */
export type FrameSource = (clip: MediaClip, sourceTime: number) => Drawable | null;

/** Unscaled, unrotated size of a layer in project pixels. */
export function layerSize(
  ctx: Ctx2D,
  project: Project,
  clip: Clip,
): { width: number; height: number } {
  if (clip.type === "text") return textBounds(ctx, clip);
  if (clip.type === "adjustment")
    return { width: project.settings.width, height: project.settings.height };
  const asset = project.assets[clip.assetId];
  if (!asset || !asset.width) return { width: 0, height: 0 };
  return containSize(asset.width, asset.height, project.settings.width, project.settings.height);
}

function drawMedia(ctx: Ctx2D, project: Project, clip: MediaClip, t: number, frames: FrameSource) {
  const frame = frames(clip, frameSourceTime(project, clip, t));
  if (!frame) return;
  const { width, height } = containSize(
    frame.width,
    frame.height,
    project.settings.width,
    project.settings.height,
  );
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
}

/** Everything the compositor needs besides the project: decoded frames, the GPU and effect lookup. */
export interface RenderServices {
  frames: FrameSource;
  /** Null when WebGL2 is unavailable: layers then render without effects. */
  gpu: GpuEffects | null;
  resolve: (effectId: string) => EffectDefinition | undefined;
  scratch: ScratchCanvases;
  /** A title drawn at rest (no animation or fades), e.g. while it is edited inline. */
  atRest?: string | null;
}

/** Reusable full-frame 2D canvases for rendering layers that go through the GPU. */
export class ScratchCanvases {
  private readonly canvases: OffscreenCanvasRenderingContext2D[] = [];

  get(slot: number, width: number, height: number): OffscreenCanvasRenderingContext2D {
    let ctx = this.canvases[slot];
    if (!ctx) {
      const created = new OffscreenCanvas(width, height).getContext("2d");
      if (!created) throw new Error("Could not create a scratch canvas");
      ctx = created;
      this.canvases[slot] = ctx;
    }
    if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
      ctx.canvas.width = width;
      ctx.canvas.height = height;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }
}

const SLOT = { from: 0, to: 1, layer: 2 } as const;

/** Clip-local time used for fades and animations: inside the clip even when a transition extends it. */
const insideClip = (clip: Clip, t: number) =>
  Math.min(clipEnd(clip) - 1e-4, Math.max(clip.start, t));

function effectPasses(
  project: Project,
  clip: Clip,
  t: number,
  services: RenderServices,
): GpuPass[] {
  const local = insideClip(clip, t);
  const time = local - clip.start;
  const progress = clip.duration > 0 ? time / clip.duration : 0;
  const resolution = [project.settings.width, project.settings.height] as const;
  const stack = clip.effects
    .filter((e) => e.enabled)
    .flatMap((e) => {
      const definition = services.resolve(e.effectId);
      return definition ? [{ definition, params: e.params, progress, time, resolution }] : [];
    });
  const reveals = animationStateAt(clip, local).reveals.flatMap((r) => {
    const definition = services.resolve(r.effectId);
    return definition
      ? [{ definition, params: defaultParams(definition), progress: r.progress, time, resolution }]
      : [];
  });
  return [...stack, ...reveals];
}

/** Draws a clip at its placed transform (plus animation motion) into `ctx`. */
function drawPlaced(
  ctx: Ctx2D,
  project: Project,
  clip: MediaClip | TextClip,
  t: number,
  motion: MotionDelta,
  alpha: number,
  frames: FrameSource,
  atRest: boolean,
) {
  const { width, height } = project.settings;
  const { x, y, scale, rotation } = clip.transform;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2 + x + motion.dx * width, height / 2 + y + motion.dy * height);
  ctx.rotate(((rotation + motion.rotation) * Math.PI) / 180);
  ctx.scale(scale * motion.scale, scale * motion.scale);
  if (clip.type === "text") drawText(ctx, clip, insideClip(clip, t), atRest);
  else drawMedia(ctx, project, clip, t, frames);
  ctx.restore();
}

/** Copies a full-frame image over `ctx` ignoring its project-space transform. */
function blit(ctx: Ctx2D, image: Drawable, alpha: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/**
 * Renders one visible clip, with its effect stack, into `ctx` at `alpha`.
 * Clips without GPU work draw straight into the target; others go through a
 * full-frame scratch canvas so effects operate in frame space.
 */
function drawClip(
  ctx: Ctx2D,
  project: Project,
  clip: MediaClip | TextClip,
  t: number,
  services: RenderServices,
  slot: number,
) {
  const local = insideClip(clip, t);
  const atRest = services.atRest === clip.id;
  const { motion } = atRest ? { motion: IDENTITY_MOTION } : animationStateAt(clip, local);
  const alpha = atRest ? clip.transform.opacity : clipOpacityAt(clip, local) * motion.opacity;
  if (alpha <= 0) return;
  const passes = services.gpu ? effectPasses(project, clip, t, services) : [];
  if (passes.length === 0 || !services.gpu) {
    drawPlaced(ctx, project, clip, t, motion, alpha, services.frames, atRest);
    return;
  }
  const scratch = services.scratch.get(slot, ctx.canvas.width, ctx.canvas.height);
  const scale = ctx.canvas.width / project.settings.width;
  scratch.setTransform(scale, 0, 0, scale, 0, 0);
  drawPlaced(scratch, project, clip, t, motion, 1, services.frames, atRest);
  blit(ctx, services.gpu.apply(scratch.canvas, passes), alpha);
}

/** Renders one side of a transition (with its own effects) into a fresh scratch canvas. */
function renderSide(
  like: Ctx2D,
  project: Project,
  clip: Clip,
  t: number,
  services: RenderServices,
  slot: number,
): OffscreenCanvasRenderingContext2D {
  const side = services.scratch.get(slot, like.canvas.width, like.canvas.height);
  const scale = like.canvas.width / project.settings.width;
  side.setTransform(scale, 0, 0, scale, 0, 0);
  if (clip.type !== "adjustment") drawClip(side, project, clip, t, services, SLOT.layer);
  return side;
}

type LayerRenderer<K extends Layer["kind"]> = (
  ctx: Ctx2D,
  project: Project,
  layer: Extract<Layer, { kind: K }>,
  t: number,
  services: RenderServices,
) => void;

const LAYER_RENDERERS: { [K in Layer["kind"]]: LayerRenderer<K> } = {
  clip: (ctx, project, { clip }, t, services) => {
    if (clip.type !== "adjustment") {
      drawClip(ctx, project, clip, t, services, SLOT.layer);
      return;
    }
    // Adjustment layers filter everything composited so far.
    const local = insideClip(clip, t);
    const alpha = clipOpacityAt(clip, local) * animationStateAt(clip, local).motion.opacity;
    const passes = services.gpu ? effectPasses(project, clip, t, services) : [];
    if (alpha <= 0 || passes.length === 0 || !services.gpu) return;
    blit(ctx, services.gpu.apply(ctx.canvas, passes), alpha);
  },
  transition: (ctx, project, layer, t, services) => {
    const from = renderSide(ctx, project, layer.from, t, services, SLOT.from);
    const to = renderSide(ctx, project, layer.to, t, services, SLOT.to);
    const definition = services.resolve(layer.transition.effectId);
    if (!services.gpu || !definition) {
      blit(ctx, from.canvas, 1 - layer.progress);
      blit(ctx, to.canvas, layer.progress);
      return;
    }
    const pass: GpuPass = {
      definition,
      params: layer.transition.params,
      progress: layer.progress,
      time: t - layer.to.start,
      resolution: [project.settings.width, project.settings.height],
    };
    blit(ctx, services.gpu.transition(from.canvas, to.canvas, pass), 1);
  },
};

/** Composites every visible layer at `t` into a canvas of any size (scaled from project pixels). */
export function renderFrame(ctx: Ctx2D, project: Project, t: number, services: RenderServices) {
  const { width, height, background } = project.settings;
  const scale = ctx.canvas.width / width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";

  for (const layer of layersAt(project, t)) {
    (LAYER_RENDERERS[layer.kind] as LayerRenderer<typeof layer.kind>)(
      ctx,
      project,
      layer as never,
      t,
      services,
    );
  }
}
