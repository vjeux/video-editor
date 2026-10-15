import { previewEffect } from "../../app/effects";
import { sampleFrames } from "../../app/sample-frames";
import type { EffectDefinition } from "../../core/types";
import type { Drawable } from "../../engine/compositor";

const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 135;
/** Seconds per hover loop of `progress`. */
const LOOP = 1.6;
/** Milliseconds of thumbnail rendering allowed per animation frame. */
const FRAME_BUDGET = 8;

/** `null` when previews are unavailable (no WebGL2). */
type Thumbnail = OffscreenCanvas | null;

/** One still per definition, invalidated when its source changes. */
const cache = new Map<string, { source: string; image: Thumbnail }>();

function cached(def: EffectDefinition): Thumbnail | undefined {
  const hit = cache.get(def.id);
  return hit?.source === def.source ? hit.image : undefined;
}

function render(def: EffectDefinition, progress: number, time: number): Drawable | null {
  const [from, to] = sampleFrames();
  return previewEffect(def, from, to, { progress, time });
}

function thumbnail(def: EffectDefinition): Thumbnail {
  const known = cached(def);
  if (known !== undefined) return known;
  // The GPU canvas is reused by the next preview, so copy it right away.
  const frame = render(def, 0.5, 0);
  const image = frame && new OffscreenCanvas(THUMB_WIDTH, THUMB_HEIGHT);
  if (frame && image) image.getContext("2d")?.drawImage(frame, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  cache.set(def.id, { source: def.source, image });
  return image;
}

export function paint(canvas: HTMLCanvasElement, image: Drawable) {
  if (canvas.width !== THUMB_WIDTH) canvas.width = THUMB_WIDTH;
  if (canvas.height !== THUMB_HEIGHT) canvas.height = THUMB_HEIGHT;
  canvas.getContext("2d")?.drawImage(image, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
}

interface Job {
  def: EffectDefinition;
  done: (image: Thumbnail) => void;
}

const queue = new Set<Job>();
let scheduled = false;

/** Renders queued thumbnails a few per frame so opening a tab never blocks. */
function pump() {
  scheduled = false;
  const deadline = performance.now() + FRAME_BUDGET;
  for (const job of queue) {
    if (performance.now() > deadline) break;
    queue.delete(job);
    job.done(thumbnail(job.def));
  }
  if (queue.size) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(pump);
}

/** Delivers the cached still (or queues its render); returns a cancel function. */
export function requestThumbnail(def: EffectDefinition, done: Job["done"]): () => void {
  const known = cached(def);
  if (known !== undefined) {
    done(known);
    return () => {};
  }
  const job = { def, done };
  queue.add(job);
  schedule();
  return () => queue.delete(job);
}

/** Loops `progress` 0→1 and advances `time` until stopped, then restores the still. */
export function animatePreview(canvas: HTMLCanvasElement, def: EffectDefinition): () => void {
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const elapsed = (now - start) / 1000;
    const image = render(def, (elapsed % LOOP) / LOOP, elapsed);
    if (image) paint(canvas, image);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    const still = cached(def);
    if (still) paint(canvas, still);
  };
}
