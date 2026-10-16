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

/** How a source file is kept: by reference, as a copy, or only until the tab closes. */
export type KeepAs = "link" | "copy" | "session";

/**
 * Links every file the browser can reopen from a handle (no quota and no
 * second copy, whatever the size), and copies the rest into storage when
 * they fit together: all of them or, if not, none.
 */
export function keepPlan(
  items: readonly { bytes: number; linkable: boolean }[],
  estimate: { usage?: number; quota?: number },
): { keep: KeepAs[]; copyBytes: number; free: number | null } {
  const copyBytes = items.reduce((sum, i) => sum + (i.linkable ? 0 : i.bytes), 0);
  const { fits, free } = storageFit(estimate, copyBytes);
  const keep = items.map((i): KeepAs => (i.linkable ? "link" : fits ? "copy" : "session"));
  return { keep, copyBytes, free };
}
