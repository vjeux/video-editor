export interface FrameRate {
  value: number;
  label: string;
}

/** Project frame rates: film, PAL, NTSC (exact 1001 ratios), their doubles, and 120. */
export const FRAME_RATES: readonly FrameRate[] = [
  { value: 24000 / 1001, label: "23.976" },
  { value: 24, label: "24" },
  { value: 25, label: "25" },
  { value: 30000 / 1001, label: "29.97" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 60000 / 1001, label: "59.94" },
  { value: 60, label: "60" },
  { value: 120, label: "120" },
];

/** How close a measured rate must be to a listed one to count as it. */
const TOLERANCE = 0.005;

/** The listed rate a source was recorded at, or null when it matches none. */
export function suggestProjectFps(measured: number | null): number | null {
  if (measured === null || measured <= 0) return null;
  const closest = FRAME_RATES.reduce((best, rate) =>
    Math.abs(rate.value - measured) < Math.abs(best.value - measured) ? rate : best,
  );
  return Math.abs(closest.value - measured) / closest.value <= TOLERANCE ? closest.value : null;
}
