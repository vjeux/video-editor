import type { MediaClip, Seconds } from "./types";

export interface SpeedRamp {
  id: string;
  name: string;
  /** [normalised clip time, relative speed] control points, 0 → 1; speed is linear between them. */
  points: readonly (readonly [number, number])[];
}

const ramp = (id: string, name: string, points: SpeedRamp["points"]): SpeedRamp => ({
  id,
  name,
  points,
});

/** The CapCut-style "velocity" presets editors reach for most. */
export const SPEED_RAMPS: Record<string, SpeedRamp> = Object.fromEntries(
  [
    ramp("velocity", "Velocity", [
      [0, 0.5],
      [0.45, 0.5],
      [0.55, 3],
      [1, 3],
    ]),
    ramp("montage", "Montage", [
      [0, 2],
      [0.35, 2],
      [0.5, 0.35],
      [0.65, 2],
      [1, 2],
    ]),
    ramp("hero", "Hero time", [
      [0, 1],
      [0.3, 1],
      [0.42, 0.25],
      [0.58, 0.25],
      [0.7, 1],
      [1, 1],
    ]),
    ramp("bullet", "Bullet", [
      [0, 0.4],
      [0.35, 0.4],
      [0.5, 3],
      [0.65, 0.4],
      [1, 0.4],
    ]),
    ramp("jumpCut", "Jump cut", [
      [0, 1],
      [0.45, 1],
      [0.5, 5],
      [0.55, 1],
      [1, 1],
    ]),
    ramp("flashIn", "Flash in", [
      [0, 4],
      [0.2, 1],
      [1, 1],
    ]),
    ramp("flashOut", "Flash out", [
      [0, 1],
      [0.8, 1],
      [1, 4],
    ]),
  ].map((r) => [r.id, r]),
);

/** Relative speed at normalised time u (clamped to the curve's ends). */
function speedOf(points: SpeedRamp["points"], u: number): number {
  const first = points[0];
  if (!first || u <= first[0]) return first?.[1] ?? 1;
  for (let i = 1; i < points.length; i++) {
    const [u1, s1] = points[i] ?? [1, 1];
    const [u0, s0] = points[i - 1] ?? [0, 1];
    if (u <= u1) return s0 + ((s1 - s0) * (u - u0)) / (u1 - u0);
  }
  return points.at(-1)?.[1] ?? 1;
}

/** ∫₀ᵘ speed — exact for the piecewise-linear curve (trapezoids). */
function areaTo(points: SpeedRamp["points"], u: number): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const [u0, s0] = points[i - 1] ?? [0, 1];
    const [u1] = points[i] ?? [1, 1];
    if (u <= u0) break;
    const end = Math.min(u, u1);
    area += ((s0 + speedOf(points, end)) / 2) * (end - u0);
  }
  return area;
}

const curveOf = (clip: MediaClip) =>
  clip.speedRamp ? SPEED_RAMPS[clip.speedRamp]?.points : undefined;

/**
 * Source time for a ramped clip. The curve is normalised so the clip still
 * covers exactly `duration × speed` of source; outside the clip (transition
 * handles) it continues at the edge speed.
 */
export function rampSourceTime(clip: MediaClip, t: Seconds): Seconds | null {
  const points = curveOf(clip);
  if (!points || clip.duration <= 0) return null;
  const total = areaTo(points, 1);
  const span = clip.speed * clip.duration;
  const u = (t - clip.start) / clip.duration;
  if (u < 0) return clip.offset + (t - clip.start) * clip.speed * (speedOf(points, 0) / total);
  if (u > 1)
    return (
      clip.offset +
      span +
      (t - clip.start - clip.duration) * clip.speed * (speedOf(points, 1) / total)
    );
  return clip.offset + span * (areaTo(points, u) / total);
}

/** Instantaneous playback rate at `t` (for audio): averages to the clip's speed. */
export function rampSpeedAt(clip: MediaClip, t: Seconds): number {
  const points = curveOf(clip);
  if (!points) return clip.speed;
  const u = Math.min(1, Math.max(0, (t - clip.start) / clip.duration));
  return clip.speed * (speedOf(points, u) / areaTo(points, 1));
}
