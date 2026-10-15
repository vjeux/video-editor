/**
 * The next enabled index from `current` moving by `delta`, wrapping at both
 * ends. From nothing (`current < 0`) it starts at the first or last enabled
 * entry; -1 when no entry is enabled.
 */
export function stepEnabled(enabled: readonly boolean[], current: number, delta: 1 | -1): number {
  const count = enabled.length;
  const start = current < 0 ? (delta > 0 ? -1 : count) : current;
  for (let i = 1; i <= count; i++) {
    const index = (((start + delta * i) % count) + count) % count;
    if (enabled[index]) return index;
  }
  return -1;
}
