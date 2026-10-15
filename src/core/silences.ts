import type { Id, IdFactory, MediaClip, Project, Seconds } from "./types";

export interface SilenceOptions {
  threshold: number;
  minSilence: Seconds;
  padding: Seconds;
}

export interface Span {
  start: Seconds;
  end: Seconds;
}

export function levelEnvelope(
  _channels: readonly Float32Array[],
  _sampleRate: number,
  _frame: Seconds,
): Float32Array {
  throw new Error("Not implemented");
}

export function detectSilences(
  _levels: Float32Array,
  _frame: Seconds,
  _options: SilenceOptions,
): Span[] {
  throw new Error("Not implemented");
}

export function silencesInClip(_clip: MediaClip, _spans: readonly Span[]): Span[] {
  throw new Error("Not implemented");
}

export function removeSpans(
  _project: Project,
  _clipId: Id,
  _spans: readonly Span[],
  _newId: IdFactory,
): Project {
  throw new Error("Not implemented");
}

export function spansLength(_spans: readonly Span[]): Seconds {
  throw new Error("Not implemented");
}
