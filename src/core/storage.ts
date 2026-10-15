export function storageFit(
  _estimate: { usage?: number; quota?: number },
  _bytes: number,
): { fits: boolean; free: number | null } {
  throw new Error("Not implemented");
}
