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

export const formatBytes = (bytes: number) =>
  bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(2)} GB`
    : bytes >= 1e6
      ? `${(bytes / 1e6).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
