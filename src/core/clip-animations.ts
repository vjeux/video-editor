import { clipEnd, findClip } from "./timeline";
import type { Clip, ClipAnimation, Easing, Id, Project, Seconds } from "./types";

/** Offsets are fractions of the frame size; scale and opacity multiply the clip's own. */
export interface MotionDelta {
  dx: number;
  dy: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface AnimationPreset {
  id: string;
  name: string;
  group: "motion" | "reveal";
  /** Motion presets: the delta at eased progress 0 (hidden) … 1 (in place). */
  motion?: (p: number) => Partial<MotionDelta>;
  /** Reveal presets: an effect driven by its `progress` uniform. */
  effectId?: string;
}

export interface AnimationState {
  motion: MotionDelta;
  reveals: { effectId: string; progress: number }[];
}

export const IDENTITY_MOTION: MotionDelta = { dx: 0, dy: 0, scale: 1, rotation: 0, opacity: 1 };

const BACK = 1.70158;

function bounceOut(p: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) return n * (p - 1.5 / d) ** 2 + 0.75;
  if (p < 2.5 / d) return n * (p - 2.25 / d) ** 2 + 0.9375;
  return n * (p - 2.625 / d) ** 2 + 0.984375;
}

const EASING_FNS: Record<Easing, (p: number) => number> = {
  linear: (p) => p,
  easeOut: (p) => 1 - (1 - p) ** 3,
  easeInOut: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  backOut: (p) => 1 + (BACK + 1) * (p - 1) ** 3 + BACK * (p - 1) ** 2,
  bounceOut,
  elasticOut: (p) =>
    p === 0 || p === 1 ? p : 2 ** (-10 * p) * Math.sin(((p * 10 - 0.75) * 2 * Math.PI) / 3) + 1,
};

export const EASINGS = Object.keys(EASING_FNS) as Easing[];
export const ease = (easing: Easing, p: number) => EASING_FNS[easing](Math.min(1, Math.max(0, p)));

const preset = (id: string, name: string, motion: AnimationPreset["motion"]): AnimationPreset => ({
  id,
  name,
  group: "motion",
  motion,
});
const reveal = (id: string, name: string, effectId: string): AnimationPreset => ({
  id,
  name,
  group: "reveal",
  effectId,
});

export const ANIMATION_PRESETS: Record<string, AnimationPreset> = Object.fromEntries(
  [
    preset("fade", "Fade", (p) => ({ opacity: p })),
    preset("slideLeft", "Slide from left", (p) => ({ dx: -(1 - p) })),
    preset("slideRight", "Slide from right", (p) => ({ dx: 1 - p })),
    preset("slideUp", "Slide up", (p) => ({ dy: 1 - p })),
    preset("slideDown", "Slide down", (p) => ({ dy: -(1 - p) })),
    preset("zoomIn", "Zoom in", (p) => ({ scale: 0.5 + 0.5 * p, opacity: p })),
    preset("zoomOut", "Zoom out", (p) => ({ scale: 1.5 - 0.5 * p, opacity: p })),
    preset("pop", "Pop", (p) => ({ scale: Math.max(0, p) })),
    preset("spin", "Spin", (p) => ({
      rotation: -180 * (1 - p),
      scale: 0.3 + 0.7 * p,
      opacity: Math.min(1, p * 1.5),
    })),
    preset("drop", "Drop", (p) => ({ dy: -0.25 * (1 - p), opacity: Math.min(1, p * 2) })),
    preset("rise", "Rise", (p) => ({ dy: 0.12 * (1 - p), opacity: p })),
    reveal("wipe", "Wipe", "reveal-wipe"),
    reveal("iris", "Iris", "reveal-iris"),
    reveal("blurIn", "Blur", "reveal-blur"),
    reveal("pixelate", "Pixelate", "reveal-pixelate"),
    reveal("glitch", "Glitch", "reveal-glitch"),
    reveal("dissolve", "Dissolve", "reveal-dissolve"),
  ].map((p) => [p.id, p]),
);

function apply(state: AnimationState, presetId: string, p: number) {
  const def = ANIMATION_PRESETS[presetId];
  if (def?.effectId) state.reveals.push({ effectId: def.effectId, progress: p });
  const delta = def?.motion?.(p);
  if (!delta) return;
  const m = state.motion;
  state.motion = {
    dx: m.dx + (delta.dx ?? 0),
    dy: m.dy + (delta.dy ?? 0),
    scale: m.scale * (delta.scale ?? 1),
    rotation: m.rotation + (delta.rotation ?? 0),
    opacity: m.opacity * (delta.opacity ?? 1),
  };
}

/** Motion and reveal progress of a clip's enter/exit animations at `t`. */
export function animationStateAt(clip: Clip, t: Seconds): AnimationState {
  const state: AnimationState = { motion: IDENTITY_MOTION, reveals: [] };
  const { animationIn: enter, animationOut: exit } = clip;
  const enterLength = Math.min(enter?.duration ?? 0, clip.duration);
  const exitLength = Math.min(exit?.duration ?? 0, clip.duration - enterLength);
  const local = t - clip.start;
  const remaining = clipEnd(clip) - t;
  if (enter && local < enterLength)
    apply(state, enter.presetId, ease(enter.easing, local / enterLength));
  if (exit && remaining < exitLength)
    apply(state, exit.presetId, ease(exit.easing, remaining / exitLength));
  return state;
}

/** Sets or clears an enter/exit animation, shortening it so the two never overlap. */
export function setAnimation(
  project: Project,
  clipId: Id,
  which: "in" | "out" | "loop",
  animation: ClipAnimation | null,
): Project {
  if (animation && !ANIMATION_PRESETS[animation.presetId]) {
    throw new Error(`Unknown animation preset ${animation.presetId}`);
  }
  const clip = findClip(project, clipId);
  const other = which === "in" ? clip.animationOut : clip.animationIn;
  const value = animation && {
    ...animation,
    duration: Math.max(0, Math.min(animation.duration, clip.duration - (other?.duration ?? 0))),
  };
  const patch = which === "in" ? { animationIn: value } : { animationOut: value };
  return { ...project, clips: { ...project.clips, [clipId]: { ...clip, ...patch } } };
}
