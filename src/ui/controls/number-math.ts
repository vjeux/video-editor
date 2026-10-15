/** Pixels of drag per step when scrubbing a number field. */
const PX_PER_STEP = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** Strips binary floating point noise such as 0.30000000000000004. */
const clean = (value: number) => Number(value.toPrecision(12));

/** Rounds `value` to the nearest multiple of `step` counted from `min`. */
export const snap = (value: number, step: number, min: number) =>
  clean(min + Math.round((value - min) / step) * step);

/** The value under a pointer at client `x` over a track. */
export function valueAt(
  x: number,
  track: { left: number; width: number },
  min: number,
  max: number,
  step: number,
): number {
  const fraction = track.width > 0 ? clamp((x - track.left) / track.width, 0, 1) : 0;
  return clamp(snap(min + fraction * (max - min), step, min), min, max);
}

/** Where a slider's fill starts: zero for ranges that straddle it (gain, pan), else the minimum. */
export const fillOrigin = (min: number, max: number) => (min < 0 && max > 0 ? 0 : min);

export const percentOf = (value: number, min: number, max: number) =>
  max > min ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0;

/** A number field's value after a horizontal drag of `dx` pixels from `start`. */
export function scrubbed(
  start: number,
  dx: number,
  step: number,
  { coarse = false, fine = false }: { coarse?: boolean; fine?: boolean },
  range: { min: number; max: number },
): number {
  const unit = step * (coarse ? 10 : fine ? 0.1 : 1);
  return clamp(clean(start + Math.round(dx / PX_PER_STEP) * unit), range.min, range.max);
}
