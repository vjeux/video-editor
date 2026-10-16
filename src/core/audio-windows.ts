import { audioTail } from "./audio-effects";
import { audibleClips, clipEnd, sourceTimeAt } from "./timeline";
import type { MediaClip, Project, Seconds } from "./types";

/** Samples `[start, end)`. */
export interface SampleRange {
  start: number;
  end: number;
}

/** One window of a mix: rendered from `renderStart`, kept from `start`. */
export interface MixWindow extends SampleRange {
  renderStart: number;
}

/**
 * Fixed windows (in samples) that tile a mix of `total` samples. Each
 * renders `preRoll` samples early so reverb and echo tails from before the
 * window are already sounding when the kept part begins.
 */
export function mixWindows(total: number, size: number, preRoll: number): MixWindow[] {
  return Array.from({ length: Math.ceil(total / size) }, (_, i) => {
    const start = i * size;
    return { start, end: Math.min(total, start + size), renderStart: Math.max(0, start - preRoll) };
  });
}

/**
 * Where a chunk of `chunkLength` samples starting at sample `chunkStart`
 * lands in `target`: chunk samples `[from, to)` go to target offset `at`.
 */
export function overlap(
  target: SampleRange,
  chunkStart: number,
  chunkLength: number,
): { from: number; to: number; at: number } | null {
  const start = Math.max(target.start, chunkStart);
  const end = Math.min(target.end, chunkStart + chunkLength);
  if (end <= start) return null;
  return { from: start - chunkStart, to: end - chunkStart, at: start - target.start };
}

/** The part of timeline window `[from, to)` that `clip` plays, and the source it reads. */
export function clipSpan(
  clip: MediaClip,
  from: Seconds,
  to: Seconds,
): { from: Seconds; to: Seconds; sourceFrom: Seconds; sourceTo: Seconds } | null {
  const begin = Math.max(from, clip.start);
  const end = Math.min(to, clipEnd(clip));
  if (end <= begin) return null;
  return {
    from: begin,
    to: end,
    sourceFrom: sourceTimeAt(clip, begin),
    sourceTo: sourceTimeAt(clip, end),
  };
}

/** How early each mix window must start rendering for every effect tail to be heard. */
export const mixPreRoll = (project: Project): Seconds =>
  audibleClips(project).reduce((max, clip) => Math.max(max, audioTail(clip.audioEffects)), 0);

export const peakBucket = (sampleRate: number, perSecond: number) =>
  Math.max(1, Math.floor(sampleRate / perSecond));

/**
 * Waveform peaks built chunk by chunk as audio decodes: the loudest
 * absolute sample per `bucket` samples, across channels.
 */
export class PeakStream {
  private readonly bucket: number;
  private data = new Float32Array(1024);
  private length = 0;

  constructor(bucket: number) {
    this.bucket = bucket;
  }

  /** `channels` hold the same number of samples, the first at sample `at`. */
  add(channels: readonly Float32Array[], at: number): void {
    const samples = channels[0]?.length ?? 0;
    if (samples === 0) return;
    const last = Math.floor((at + samples - 1) / this.bucket);
    this.grow(last + 1);
    const { data, bucket } = this;
    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        const v = Math.abs(channel[i]!);
        const b = ((at + i) / bucket) | 0;
        if (v > data[b]!) data[b] = v;
      }
    }
  }

  peaks(): Float32Array {
    return this.data.slice(0, this.length);
  }

  private grow(length: number) {
    if (length > this.data.length) {
      const next = new Float32Array(Math.max(length, this.data.length * 2));
      next.set(this.data);
      this.data = next;
    }
    this.length = Math.max(this.length, length);
  }
}
