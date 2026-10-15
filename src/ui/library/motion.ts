import { ease, IDENTITY_MOTION, type AnimationPreset } from "../../core/clip-animations";

/** Seconds the preview takes to move in, and per full loop (the rest holds in place). */
const MOVE = 0.7;
const LOOP = 1.3;

/** Shown when not hovered: halfway, so the preset's character is visible at rest. */
export const STILL_PROGRESS = 0.5;

export const loopProgress = (elapsed: number) => ease("easeOut", (elapsed % LOOP) / MOVE);

/** CSS for a preset's motion delta; offsets are fractions of the preview frame. */
export function motionStyle(preset: AnimationPreset, p: number) {
  const m = { ...IDENTITY_MOTION, ...preset.motion?.(p) };
  return {
    transform: `translate(${m.dx * 100}%, ${m.dy * 100}%) scale(${m.scale}) rotate(${m.rotation}deg)`,
    opacity: m.opacity,
  };
}
