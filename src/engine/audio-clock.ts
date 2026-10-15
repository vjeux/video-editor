/**
 * The AudioContext time of the sample being heard right now: the output
 * timestamp extrapolated to `nowMs` (smooth, and includes output latency),
 * or `currentTime` minus the reported latency where the timestamp is
 * unavailable or has not started yet.
 */
export function audibleContextTime({
  output,
  currentTime,
  latency,
  nowMs,
}: {
  output: { contextTime: number; performanceTime: number } | null;
  currentTime: number;
  latency: number;
  nowMs: number;
}): number {
  if (output && output.contextTime > 0 && output.performanceTime > 0) {
    return output.contextTime + (nowMs - output.performanceTime) / 1000;
  }
  return currentTime - latency;
}
