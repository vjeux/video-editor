export function audibleContextTime(_clock: {
  output: { contextTime: number; performanceTime: number } | null;
  currentTime: number;
  latency: number;
  nowMs: number;
}): number {
  throw new Error("Not implemented");
}
