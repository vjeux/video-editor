import { createTextClip } from "./factories";
import { placeClip, sourceTimeAt } from "./timeline";
import { addTrack } from "./tracks";
import type {
  Id,
  IdFactory,
  Karaoke,
  MediaClip,
  Project,
  Seconds,
  TextClip,
  TextMotion,
  TextStyle,
  TimedWord,
} from "./types";

/** A word as Whisper returns it: text with its leading space, end possibly unknown. */
export interface RawWord {
  text: string;
  start: Seconds;
  end: Seconds | null;
}

/** A slice of audio sent to the model, owning the words whose midpoint falls in `keepFrom…keepTo`. */
export interface TranscriptionWindow {
  start: Seconds;
  end: Seconds;
  keepFrom: Seconds;
  keepTo: Seconds;
}

export interface CaptionOptions {
  /** Most words on screen at once. */
  maxWords: number;
  /** Most characters (with spaces) on screen at once. */
  maxChars: number;
  /** A longer silence always starts a new caption. */
  maxGap: Seconds;
  /** How long a caption stays after its last word when a pause follows. */
  hold: Seconds;
  uppercase: boolean;
  stripPunctuation: boolean;
}

export interface CaptionChunk {
  text: string;
  start: Seconds;
  end: Seconds;
  /** Word timings relative to the caption's start. */
  words: TimedWord[];
}

/** How generated captions look: a caption preset's style, motion and karaoke. */
export interface CaptionLook {
  style: Partial<TextStyle>;
  textMotion: TextMotion | null;
  karaoke: Karaoke | null;
}

/** Shortest a word may last, so karaoke can show it. */
const MIN_WORD: Seconds = 0.12;
/** Captions sit in the lower third, as a fraction of the frame height below centre. */
const LOWER_THIRD = 0.28;
const SENTENCE_END = /[.!?…]["')\]]*$/;
const CLAUSE_END = /[,;:]["')\]]*$/;
/** Whisper's non-speech annotations: [BLANK_AUDIO], (music), *laughs*… */
const NON_SPEECH = /^[[(*♪].*[\])*♪]$/;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** Strips binary floating point noise such as 3.5000000000000004. */
const clean = (t: number) => Number(t.toPrecision(12));

/**
 * Turns the model's word list into clean words: pieces without a leading
 * space join the previous word, non-speech tags are dropped, unknown ends
 * run to the next word, and every word lasts at least MIN_WORD without
 * running into the next.
 */
export function cleanWords(raw: readonly RawWord[]): TimedWord[] {
  const joined = raw.reduce<RawWord[]>((words, piece) => {
    const previous = words.at(-1);
    if (previous && !/^\s/.test(piece.text) && piece.text.trim()) {
      previous.text += piece.text;
      previous.end = piece.end ?? previous.end;
      return words;
    }
    const text = piece.text.trim();
    if (!text || NON_SPEECH.test(text)) return words;
    return [...words, { ...piece, text }];
  }, []);
  return joined.map((word, i) => {
    const next = joined[i + 1]?.start ?? Infinity;
    const end = word.end ?? next;
    const floor = Math.min(word.start + MIN_WORD, next);
    return { text: word.text, start: word.start, end: clean(Math.max(end, floor)) };
  });
}

/**
 * Splits `duration` seconds into windows of `size` overlapping by `overlap`,
 * each owning up to the middle of its overlaps so words cut at a window edge
 * are taken from the window that heard them whole.
 */
export function transcriptionWindows(
  duration: Seconds,
  size = 30,
  overlap = 4,
): TranscriptionWindow[] {
  const step = size - overlap;
  const count = duration <= size ? 1 : Math.ceil((duration - overlap) / step);
  return Array.from({ length: count }, (_, i) => {
    const start = i * step;
    const last = i === count - 1;
    return {
      start,
      end: last ? duration : start + size,
      keepFrom: i === 0 ? 0 : start + overlap / 2,
      keepTo: last ? duration : start + size - overlap / 2,
    };
  });
}

/** Joins per-window words (window-relative times) into one list, each word once. */
export function mergeWindows(
  results: readonly { window: TranscriptionWindow; words: readonly TimedWord[] }[],
): TimedWord[] {
  return results.flatMap(({ window, words }) => {
    // Models can time a word past the end of their audio; keep it, clamped.
    const length = window.end - window.start;
    return words
      .map((w) => ({
        text: w.text,
        start: clean(Math.min(w.start, length) + window.start),
        end: clean(Math.min(w.end, length) + window.start),
      }))
      .filter((w) => {
        const mid = (w.start + w.end) / 2;
        return mid >= window.keepFrom && (mid < window.keepTo || window.keepTo === window.end);
      });
  });
}

const display = (text: string, options: CaptionOptions) => {
  const bare = options.stripPunctuation ? text.replace(EDGE_PUNCTUATION, "") : text;
  return options.uppercase ? bare.toUpperCase() : bare;
};

/**
 * Groups words into on-screen captions: a new one starts after a sentence
 * ends (or a clause, once half full), after a pause longer than `maxGap`, or before the word or character
 * limit would be passed. A caption runs into the next one across short
 * gaps, and otherwise holds briefly after its last word.
 */
export function chunkCaptions(
  words: readonly TimedWord[],
  options: CaptionOptions,
): CaptionChunk[] {
  const groups = words.reduce<TimedWord[][]>((acc, word) => {
    const current = acc.at(-1);
    const previous = current?.at(-1);
    const chars = (current ?? []).map((w) => w.text).join(" ").length + 1 + word.text.length;
    const fresh =
      !current ||
      !previous ||
      SENTENCE_END.test(previous.text) ||
      (CLAUSE_END.test(previous.text) && current.length >= Math.ceil(options.maxWords / 2)) ||
      word.start - previous.end > options.maxGap ||
      current.length >= options.maxWords ||
      chars > options.maxChars;
    if (fresh) return [...acc, [word]];
    current.push(word);
    return acc;
  }, []);

  return groups.flatMap((group, i) => {
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) return [];
    const next = groups[i + 1]?.[0]?.start;
    const end =
      next !== undefined && next - last.end <= options.maxGap
        ? next
        : Math.min(last.end + options.hold, next ?? Infinity);
    const shown = group
      .map((w) => ({ ...w, text: display(w.text, options) }))
      .filter((w) => w.text);
    return [
      {
        text: shown.map((w) => w.text).join(" "),
        start: first.start,
        end: clean(end),
        words: shown.map((w) => ({
          text: w.text,
          start: clean(w.start - first.start),
          end: clean(w.end - first.start),
        })),
      },
    ];
  });
}

const BISECTION_STEPS = 40;

/**
 * The timeline time at which `clip` plays source time `sourceTime`: the
 * inverse of its speed (and ramp) mapping; null outside its source range.
 */
export function timelineTimeOf(clip: MediaClip, sourceTime: Seconds): Seconds | null {
  const end = clip.start + clip.duration;
  const from = sourceTimeAt(clip, clip.start);
  const to = sourceTimeAt(clip, end);
  const eps = 1e-9;
  if (sourceTime < from - eps || sourceTime > to + eps) return null;
  if (!clip.speedRamp) return clean(clip.start + (sourceTime - clip.offset) / clip.speed);
  // Ramps are monotonic, so bisection finds the moment that source plays.
  let lo = clip.start;
  let hi = end;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (sourceTimeAt(clip, mid) < sourceTime) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Places a clip's source-time words on the timeline, dropping those outside the clip. */
export function wordsOnTimeline(clip: MediaClip, words: readonly TimedWord[]): TimedWord[] {
  const clipEnd = clip.start + clip.duration;
  return words.flatMap((word) => {
    const start = timelineTimeOf(clip, word.start);
    if (start === null) return [];
    return [{ text: word.text, start, end: timelineTimeOf(clip, word.end) ?? clipEnd }];
  });
}

const CAPTIONS_TRACK = "Captions";

/**
 * Adds one title per caption, in `look`, on a new "Captions" track above
 * everything else, so existing titles are left untouched.
 */
export function addCaptions(
  project: Project,
  chunks: readonly CaptionChunk[],
  look: CaptionLook,
  newId: IdFactory,
): { project: Project; trackId: Id; clipIds: Id[] } {
  const added = addTrack(project, "text", newId());
  const tracks = added.project.tracks.map((t) =>
    t.id === added.trackId ? { ...t, name: CAPTIONS_TRACK } : t,
  );
  const y = Math.round(project.settings.height * LOWER_THIRD);
  const clips = chunks.map((chunk): TextClip => {
    const base = createTextClip({
      id: newId(),
      trackId: added.trackId,
      start: chunk.start,
      text: chunk.text,
    });
    return {
      ...base,
      duration: clean(chunk.end - chunk.start),
      style: { ...base.style, ...look.style },
      animation: "none",
      textMotion: look.textMotion,
      karaoke: look.karaoke,
      words: chunk.words,
      fadeOut: 0,
      transform: { ...base.transform, y },
    };
  });
  const placed = clips.reduce((acc, clip) => placeClip(acc, clip, newId), {
    ...added.project,
    tracks,
  });
  return { project: placed, trackId: added.trackId, clipIds: clips.map((c) => c.id) };
}
