import {
  clipEnd,
  findClip,
  removeClips,
  sourceTimeAt,
  splitClip,
  timelineTimeOf,
} from "./timeline";
import type { Id, IdFactory, MediaClip, Project, Seconds } from "./types";

export interface SilenceOptions {
  /** Level (dBFS) below which audio counts as silent. */
  threshold: number;
  /** Shortest pause worth cutting. */
  minSilence: Seconds;
  /** Kept on each side of speech so words are not clipped. */
  padding: Seconds;
}

export interface Span {
  start: Seconds;
  end: Seconds;
}

/** What digital silence measures as, instead of -Infinity. */
const FLOOR_DB = -100;
/** Cuts shorter than this are not worth a jump cut. */
const MIN_CUT: Seconds = 0.05;
const EPSILON = 1e-6;

const clean = (t: number) => Number(t.toPrecision(12));

/** RMS level in dBFS of every `frame` seconds of audio, its channels mixed to mono. */
export function levelEnvelope(
  channels: readonly Float32Array[],
  sampleRate: number,
  frame: Seconds,
): Float32Array {
  const stream = new LevelStream(sampleRate, frame);
  stream.add(channels, 0);
  return stream.levels();
}

/**
 * The level envelope built chunk by chunk as audio decodes, so a long
 * recording never has to sit in memory whole.
 */
export class LevelStream {
  private readonly size: number;
  private sums = new Float64Array(1024);
  private counts = new Uint32Array(1024);
  private length = 0;

  constructor(sampleRate: number, frame: Seconds) {
    this.size = Math.max(1, Math.round(sampleRate * frame));
  }

  /** `channels` hold the same number of samples, the first at sample `at`. */
  add(channels: readonly Float32Array[], at: number): void {
    const samples = channels[0]?.length ?? 0;
    if (samples === 0) return;
    this.grow(Math.floor((at + samples - 1) / this.size) + 1);
    const { sums, counts, size } = this;
    for (let i = 0; i < samples; i++) {
      let mixed = 0;
      for (const channel of channels) mixed += channel[i] ?? 0;
      mixed /= channels.length;
      const f = ((at + i) / size) | 0;
      sums[f]! += mixed * mixed;
      counts[f]!++;
    }
  }

  levels(): Float32Array {
    return Float32Array.from({ length: this.length }, (_, f) => {
      const rms = Math.sqrt(this.sums[f]! / Math.max(1, this.counts[f]!));
      return rms > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(rms)) : FLOOR_DB;
    });
  }

  private grow(length: number) {
    if (length > this.sums.length) {
      const capacity = Math.max(length, this.sums.length * 2);
      const sums = new Float64Array(capacity);
      const counts = new Uint32Array(capacity);
      sums.set(this.sums);
      counts.set(this.counts);
      this.sums = sums;
      this.counts = counts;
    }
    this.length = Math.max(this.length, length);
  }
}

/**
 * Quiet runs (below `threshold`) of at least `minSilence`, in envelope
 * time. `padding` is kept next to speech so words keep their attack and
 * tail; runs at the very start or end of the audio are cut to the edge.
 */
export function detectSilences(
  levels: Float32Array,
  frame: Seconds,
  { threshold, minSilence, padding }: SilenceOptions,
): Span[] {
  const runs: [number, number][] = [];
  let from = -1;
  levels.forEach((level, i) => {
    if (level < threshold && from < 0) from = i;
    if (level >= threshold && from >= 0) {
      runs.push([from, i]);
      from = -1;
    }
  });
  if (from >= 0) runs.push([from, levels.length]);
  return runs.flatMap(([a, b]) => {
    if ((b - a) * frame < minSilence - EPSILON) return [];
    const start = clean(a * frame + (a > 0 ? padding : 0));
    const end = clean(b * frame - (b < levels.length ? padding : 0));
    return end - start >= MIN_CUT - EPSILON ? [{ start, end }] : [];
  });
}

/** Maps source-time silences into where `clip` plays them on the timeline. */
export function silencesInClip(clip: MediaClip, spans: readonly Span[]): Span[] {
  const from = sourceTimeAt(clip, clip.start);
  const to = sourceTimeAt(clip, clipEnd(clip));
  return spans.flatMap((span) => {
    const a = Math.max(span.start, from);
    const b = Math.min(span.end, to);
    const start = b - a >= MIN_CUT ? timelineTimeOf(clip, a) : null;
    const end = start === null ? null : timelineTimeOf(clip, b);
    return start === null || end === null ? [] : [{ start: clean(start), end: clean(end) }];
  });
}

/**
 * Cuts each timeline span out of the clip, closing the gap on its own track
 * (a jump cut). Spans go from the last to the first so earlier positions
 * hold; the clip's first piece keeps its id.
 */
export function removeSpans(
  project: Project,
  clipId: Id,
  spans: readonly Span[],
  newId: IdFactory,
): Project {
  return [...spans]
    .sort((x, y) => y.start - x.start)
    .reduce((p, span) => {
      if (!(clipId in p.clips)) return p;
      const clip = findClip(p, clipId);
      const a = Math.max(span.start, clip.start);
      const b = Math.min(span.end, clipEnd(clip));
      if (b - a < EPSILON) return p;
      let middle = clipId;
      let next = p;
      if (a > clip.start + EPSILON) {
        const right = newId();
        next = splitClip(next, clipId, a, () => right);
        middle = right;
      }
      if (b < clipEnd(findClip(next, middle)) - EPSILON) next = splitClip(next, middle, b, newId);
      return removeClips(next, [middle], { ripple: true });
    }, project);
}

export const spansLength = (spans: readonly Span[]): Seconds =>
  clean(spans.reduce((sum, s) => sum + s.end - s.start, 0));

/** Where between noise floor and speech the suggested threshold sits. */
const THRESHOLD_POSITION = 0.3;
const THRESHOLD_RANGE = [-60, -20] as const;

/**
 * A starting threshold for this recording: 30% of the way from its noise
 * floor (10th percentile level) to its speech (90th percentile).
 */
export function suggestThreshold(levels: Float32Array): number {
  const sorted = Float32Array.from(levels).sort();
  const at = (q: number) => sorted[Math.floor(q * (sorted.length - 1))] ?? FLOOR_DB;
  const noise = at(0.1);
  const speech = at(0.9);
  const threshold = Math.round(noise + (speech - noise) * THRESHOLD_POSITION);
  return Math.min(THRESHOLD_RANGE[1], Math.max(THRESHOLD_RANGE[0], threshold));
}
