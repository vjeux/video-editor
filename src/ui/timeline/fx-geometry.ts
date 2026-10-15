/** Shortest animation or transition a drag can make. */
const MIN_DURATION = 0.1;
const CHIP_GAP = 4;
/** Average advance of the chip font plus the chip's dot and padding. */
const CHAR_WIDTH = 5.6;
const CHIP_CHROME = 18;

/** Estimated width of an effect chip, so layout needs no DOM measurement. */
export const chipWidth = (label: string) => Math.ceil(label.length * CHAR_WIDTH + CHIP_CHROME);

/**
 * How many effect chips fit in `available` pixels. When not all do, room is
 * kept for a "+N" counter; when not even that fits, nothing is shown.
 */
export function fitChips(
  names: readonly string[],
  available: number,
): { shown: number; hidden: number } {
  const widths = names.map(chipWidth);
  const span = (count: number) => widths.slice(0, count).reduce((sum, w) => sum + w + CHIP_GAP, 0);
  if (span(names.length) - CHIP_GAP <= available) return { shown: names.length, hidden: 0 };
  for (let shown = names.length - 1; shown >= 0; shown--) {
    const hidden = names.length - shown;
    if (span(shown) + chipWidth(`+${hidden}`) <= available) return { shown, hidden };
  }
  return { shown: 0, hidden: 0 };
}

/** An enter animation grows as its inner edge moves right; an exit as it moves left. */
export const animationDurationFromDrag = (start: number, which: "in" | "out", dt: number) =>
  Math.max(MIN_DURATION, which === "in" ? start + dt : start - dt);

/** Transitions are centred on their cut, so either edge resizes both sides. */
export const transitionDurationFromDrag = (start: number, edge: "start" | "end", dt: number) =>
  Math.max(MIN_DURATION, edge === "end" ? start + 2 * dt : start - 2 * dt);
