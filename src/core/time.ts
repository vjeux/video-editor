import type { Seconds } from "./types";

export function snapToFrame(_t: Seconds, _fps: number): Seconds {
  throw new Error("not implemented");
}

export function formatTimecode(_t: Seconds, _fps: number): string {
  throw new Error("not implemented");
}

export function formatDuration(_t: Seconds): string {
  throw new Error("not implemented");
}
