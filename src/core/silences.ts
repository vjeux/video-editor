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
  const length = channels[0]?.length ?? 0;
  const size = Math.max(1, Math.round(sampleRate * frame));
  return Float32Array.from({ length: Math.ceil(length / size) }, (_, f) => {
    const from = f * size;
    const to = Math.min(length, from + size);
    let sum = 0;
    for (let i = from; i < to; i++) {
      const mixed = channels.reduce((acc, ch) => acc + (ch[i] ?? 0), 0) / channels.length;
      sum += mixed * mixed;
    }
    const rms = Math.sqrt(sum / Math.max(1, to - from));
    return rms > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(rms)) : FLOOR_DB;
  });
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
