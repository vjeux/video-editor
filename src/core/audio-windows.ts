import type { MediaClip, Project, Seconds } from "./types";

/** Samples `[start, end)`. */
export interface SampleRange {
  start: number;
  end: number;
}

export interface MixWindow extends SampleRange {
  renderStart: number;
}

export function mixWindows(_total: number, _size: number, _preRoll: number): MixWindow[] {
  throw new Error("Not implemented");
}

export function overlap(
  _target: SampleRange,
  _chunkStart: number,
  _chunkLength: number,
): { from: number; to: number; at: number } | null {
  throw new Error("Not implemented");
}

export function clipSpan(
  _clip: MediaClip,
  _from: Seconds,
  _to: Seconds,
): { from: Seconds; to: Seconds; sourceFrom: Seconds; sourceTo: Seconds } | null {
  throw new Error("Not implemented");
}

export function mixPreRoll(_project: Project): Seconds {
  throw new Error("Not implemented");
}

export function peakBucket(_sampleRate: number, _perSecond: number): number {
  throw new Error("Not implemented");
}

export class PeakStream {
  constructor(_bucket: number) {
    throw new Error("Not implemented");
  }

  add(_channels: readonly Float32Array[], _at: number): void {
    throw new Error("Not implemented");
  }

  peaks(): Float32Array {
    throw new Error("Not implemented");
  }
}
