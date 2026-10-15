import { ease } from "./clip-animations";
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

export const GLYPH_IDENTITY: GlyphDelta = { opacity: 1, dx: 0, dy: 0, scale: 1, rotation: 0 };

const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
const enter = (
  id: string,
  name: string,
  motion: TextMotionPreset["motion"],
  easing?: Easing,
): TextMotionPreset => ({
  id,
  name,
  kind: "enter",
  motion,
  ...(easing && { easing }),
});
const continuous = (
  id: string,
  name: string,
  motion: TextMotionPreset["motion"],
): TextMotionPreset => ({
  id,
  name,
  kind: "continuous",
  motion,
});
const wave = (phase: number) => Math.sin(phase * 2 * Math.PI);

/** The per-word/per-letter animations short-form captions use most. */
export const TEXT_MOTION_PRESETS: Record<string, TextMotionPreset> = Object.fromEntries(
  [
    enter("pop", "Pop", (p) => ({ scale: p, opacity: Math.min(1, p * 3) }), "backOut"),
    enter("slideUp", "Slide up", (p) => ({ dy: 0.6 * (1 - p), opacity: p }), "easeOut"),
    enter("slideDown", "Slide down", (p) => ({ dy: -0.6 * (1 - p), opacity: p }), "easeOut"),
    enter("fade", "Fade", (p) => ({ opacity: p })),
    enter(
      "bounce",
      "Bounce",
      (p) => ({ dy: -0.8 * (1 - p), opacity: Math.min(1, p * 4) }),
      "bounceOut",
    ),
    enter(
      "rotate",
      "Rotate",
      (p) => ({ rotation: -25 * (1 - p), dy: 0.2 * (1 - p), opacity: p }),
      "backOut",
    ),
    enter("zoom", "Zoom", (p) => ({ scale: 1.8 - 0.8 * p, opacity: p }), "easeOut"),
    enter("typewriter", "Typewriter", (p) => ({ opacity: p > 0 ? 1 : 0 })),
    continuous("wave", "Wave", (phase) => ({ dy: -0.15 * wave(phase) })),
    continuous("jiggle", "Jiggle", (phase) => ({ rotation: 6 * wave(phase) })),
  ].map((preset) => [preset.id, preset]),
);

const BOUNDARIES: Record<TextUnit, RegExp> = {
  letter: /\S/gu,
  word: /\S+/gu,
  line: /^.*$/gu,
};

/** Splits a title into animation units; spaces advance the layout but are never units. */
export function segmentText(text: string, unit: TextUnit): TextSegment[] {
  let index = 0;
  return text.split("\n").flatMap((lineText, line) =>
    [...lineText.matchAll(new RegExp(BOUNDARIES[unit].source, "gu"))]
      .filter((m) => m[0].length > 0)
      .map((m) => ({
        index: index++,
        line,
        from: m.index,
        to: m.index + m[0].length,
        text: m[0],
      })),
  );
}

const fill = (delta: Partial<GlyphDelta>): GlyphDelta => ({ ...GLYPH_IDENTITY, ...delta });

/**
 * A unit's offset at clip-local time `local`. Enter presets play once, each
 * unit `stagger` seconds after the previous; continuous presets cycle with
 * `duration` as the period and `stagger` as the per-unit phase offset.
 */
export function unitDelta(
  motion: TextMotion,
  index: number,
  _count: number,
  local: Seconds,
): GlyphDelta {
  const preset = TEXT_MOTION_PRESETS[motion.presetId];
  if (!preset || motion.duration <= 0) return GLYPH_IDENTITY;
  const elapsed = local - index * motion.stagger;
  if (preset.kind === "continuous") {
    const phase = (((elapsed / motion.duration) % 1) + 1) % 1;
    return fill(preset.motion(phase));
  }
  if (elapsed >= motion.duration) return GLYPH_IDENTITY;
  if (elapsed < 0) return fill(preset.motion(0));
  return fill(preset.motion(ease(motion.easing, elapsed / motion.duration)));
}

/** Time until the last unit has finished entering. */
export const textMotionLength = (motion: TextMotion, count: number): Seconds =>
  Math.max(0, count - 1) * motion.stagger + motion.duration;

/** Which word is being "sung" at `t`: words share the clip's duration evenly. */
export function karaokeAt(clip: TextClip, t: Seconds): { index: number; fraction: number } {
  const count = Math.max(1, segmentText(clip.text, "word").length);
  const progress = clamp01((t - clip.start) / clip.duration) * count;
  const index = Math.min(count - 1, Math.floor(progress));
  return { index, fraction: Math.min(1, progress - index) };
}
