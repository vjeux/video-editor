import type {
  IdFactory,
  Id,
  Karaoke,
  MediaClip,
  Project,
  Seconds,
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

export interface TranscriptionWindow {
  start: Seconds;
  end: Seconds;
  keepFrom: Seconds;
  keepTo: Seconds;
}

export interface CaptionOptions {
  maxWords: number;
  maxChars: number;
  maxGap: Seconds;
  hold: Seconds;
  uppercase: boolean;
  stripPunctuation: boolean;
}

export interface CaptionChunk {
  text: string;
  start: Seconds;
  end: Seconds;
  words: TimedWord[];
}

export interface CaptionLook {
  style: Partial<TextStyle>;
  textMotion: TextMotion | null;
  karaoke: Karaoke | null;
}

export function cleanWords(_raw: readonly RawWord[]): TimedWord[] {
  throw new Error("Not implemented");
}

export function transcriptionWindows(
  _duration: Seconds,
  _size = 30,
  _overlap = 4,
): TranscriptionWindow[] {
  throw new Error("Not implemented");
}

export function mergeWindows(
  _results: readonly { window: TranscriptionWindow; words: readonly TimedWord[] }[],
): TimedWord[] {
  throw new Error("Not implemented");
}

export function chunkCaptions(
  _words: readonly TimedWord[],
  _options: CaptionOptions,
): CaptionChunk[] {
  throw new Error("Not implemented");
}

export function timelineTimeOf(_clip: MediaClip, _sourceTime: Seconds): Seconds | null {
  throw new Error("Not implemented");
}

export function wordsOnTimeline(_clip: MediaClip, _words: readonly TimedWord[]): TimedWord[] {
  throw new Error("Not implemented");
}

export function addCaptions(
  _project: Project,
  _chunks: readonly CaptionChunk[],
  _look: CaptionLook,
  _newId: IdFactory,
): { project: Project; trackId: Id; clipIds: Id[] } {
  throw new Error("Not implemented");
}
