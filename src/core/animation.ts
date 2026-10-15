import type { Clip, MediaClip, Seconds, TextClip } from "./types";

export interface TextAnimationState {
  opacity: number;
  offsetY: number;
  blur: number;
  visibleChars: number;
}

export function fadeEnvelope(_clip: Clip, _t: Seconds): number {
  throw new Error("not implemented");
}

export function clipOpacityAt(_clip: Clip, _t: Seconds): number {
  throw new Error("not implemented");
}

export function gainAt(_clip: MediaClip, _t: Seconds): number {
  throw new Error("not implemented");
}

export function textAnimationState(_clip: TextClip, _t: Seconds): TextAnimationState {
  throw new Error("not implemented");
}
