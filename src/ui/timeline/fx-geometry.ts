export function chipWidth(_label: string): number {
  throw new Error("Not implemented");
}

export function fitChips(
  _names: readonly string[],
  _available: number,
): { shown: number; hidden: number } {
  throw new Error("Not implemented");
}

export function animationDurationFromDrag(
  _start: number,
  _which: "in" | "out",
  _dt: number,
): number {
  throw new Error("Not implemented");
}

export function transitionDurationFromDrag(
  _start: number,
  _edge: "start" | "end",
  _dt: number,
): number {
  throw new Error("Not implemented");
}
