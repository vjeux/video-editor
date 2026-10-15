import { ANIMATION_PRESETS } from "../../core/clip-animations";
import { timeToX } from "../../core/layout";
import type { Clip } from "../../core/types";
import { chipWidth } from "./fx-geometry";

const FIELD = { in: "animationIn", out: "animationOut" } as const;
/** Bands narrower than this show only an arrow… */
const LABEL_MIN_WIDTH = 64;
/** …and narrower than this nothing. */
const ARROW_MIN_WIDTH = 24;

/**
 * The label an animation cap shows in the clip's bottom row, and the room
 * it takes there so effect chips can flow around it.
 */
export function capLabel(
  clip: Clip,
  which: "in" | "out",
  pps: number,
): { text: string; band: number; width: number } | null {
  const animation = clip[FIELD[which]];
  if (!animation) return null;
  const band = timeToX(Math.min(animation.duration, clip.duration), pps);
  if (band < ARROW_MIN_WIDTH) return null;
  const arrow = which === "in" ? "↗" : "↘";
  const name = ANIMATION_PRESETS[animation.presetId]?.name ?? animation.presetId;
  const text = band >= LABEL_MIN_WIDTH ? `${arrow} ${name}` : arrow;
  return { text, band, width: chipWidth(text) };
}
