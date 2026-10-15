export interface Tick {
  time: number;
  major: boolean;
}

export function containSize(
  _srcW: number,
  _srcH: number,
  _dstW: number,
  _dstH: number,
): { width: number; height: number } {
  throw new Error("not implemented");
}

export function timeToX(_t: number, _pxPerSecond: number): number {
  throw new Error("not implemented");
}

export function xToTime(_x: number, _pxPerSecond: number): number {
  throw new Error("not implemented");
}

export function visibleTicks(_range: { pxPerSecond: number; from: number; to: number }): {
  major: number;
  ticks: Tick[];
} {
  throw new Error("not implemented");
}
