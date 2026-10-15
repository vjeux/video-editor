/** Share of the quota left untouched, so autosave and other writes still fit. */
const HEADROOM = 0.05;

/**
 * Whether copying `bytes` into the browser's storage fits its estimate.
 * `free` is null when the browser does not report one; the write is then
 * attempted and a quota error is the answer.
 */
export function storageFit(
  estimate: { usage?: number; quota?: number },
  bytes: number,
): { fits: boolean; free: number | null } {
  const { usage, quota } = estimate;
  if (usage === undefined || quota === undefined) return { fits: true, free: null };
  const free = quota - usage;
  return { fits: bytes <= free - quota * HEADROOM, free };
}
