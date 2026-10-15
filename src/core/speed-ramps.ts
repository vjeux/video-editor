import type { MediaClip, Seconds } from "./types";

export interface SpeedRamp {
  id: string;
  name: string;
  /** [normalised clip time, relative speed] control points, 0 → 1. */
  points: readonly (readonly [number, number])[];
}

export const SPEED_RAMPS: Record<string, SpeedRamp> = {};

export const rampSpeedAt = (_clip: MediaClip, _t: Seconds): number => {
  throw new Error("not implemented");
};
