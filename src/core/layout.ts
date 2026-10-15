export interface Tick {
  time: number;
  major: boolean;
}

/** Candidate major spacings, in seconds. */
const MAJOR_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600];
const MIN_MAJOR_PX = 60;
const MINOR_DIVISIONS = 5;

export function containSize(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  return { width: srcW * scale, height: srcH * scale };
}

export function timeToX(t: number, pxPerSecond: number): number {
  return t * pxPerSecond;
}

export function xToTime(x: number, pxPerSecond: number): number {
  return Math.max(0, x / pxPerSecond);
}

export function visibleTicks({
  pxPerSecond,
  from,
  to,
}: {
  pxPerSecond: number;
  from: number;
  to: number;
}) {
  const major = MAJOR_STEPS.find((step) => step * pxPerSecond >= MIN_MAJOR_PX) ?? 3600;
  const minor = major / MINOR_DIVISIONS;
  const first = Math.max(0, Math.floor(from / minor));
  const last = Math.ceil(to / minor);
  const ticks: Tick[] = [];
  for (let i = first; i <= last; i++) {
    const time = i * minor;
    if (time > to) break;
    ticks.push({ time, major: i % MINOR_DIVISIONS === 0 });
  }
  return { major, ticks };
}
