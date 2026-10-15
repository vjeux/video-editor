import type { Easing, Seconds, TextClip, TextMotion, TextUnit } from "./types";

export interface TextSegment {
  index: number;
  line: number;
  /** Character offsets within the line. */
  from: number;
  to: number;
  text: string;
}

/** A unit's offset from its resting place: offsets in em, scale and opacity multiply. */
export interface GlyphDelta {
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  rotation: number;
}

export interface TextMotionPreset {
  id: string;
  name: string;
  /** "enter" presets settle once played; "continuous" ones keep moving. */
  kind: "enter" | "continuous";
  easing?: Easing;
  motion: (p: number) => Partial<GlyphDelta>;
}

const todo = (): never => {
  throw new Error("not implemented");
};

export const GLYPH_IDENTITY: GlyphDelta = { opacity: 1, dx: 0, dy: 0, scale: 1, rotation: 0 };
export const TEXT_MOTION_PRESETS: Record<string, TextMotionPreset> = {};
export const segmentText = (_text: string, _unit: TextUnit): TextSegment[] => todo();
export const unitDelta = (
  _motion: TextMotion,
  _index: number,
  _count: number,
  _local: Seconds,
): GlyphDelta => todo();
export const textMotionLength = (_motion: TextMotion, _count: number): Seconds => todo();
export const karaokeAt = (_clip: TextClip, _t: Seconds): { index: number; fraction: number } =>
  todo();
