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

const todo = (): never => {
  throw new Error("not implemented");
};

export const IDENTITY_MOTION: MotionDelta = { dx: 0, dy: 0, scale: 1, rotation: 0, opacity: 1 };
export const EASINGS: readonly Easing[] = [
  "linear",
  "easeOut",
  "easeInOut",
  "backOut",
  "bounceOut",
];
export const ANIMATION_PRESETS: Record<string, AnimationPreset> = {};
export const ease = (_easing: Easing, _p: number): number => todo();
export const animationStateAt = (_clip: Clip, _t: Seconds): AnimationState => todo();
export const setAnimation = (
  _p: Project,
  _clipId: Id,
  _which: "in" | "out",
  _anim: ClipAnimation | null,
): Project => todo();
