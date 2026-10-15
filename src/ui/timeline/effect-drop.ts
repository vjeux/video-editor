import { cutsOnTrack, type Cut } from "../../core/effects";
import { clipEnd, clipKind, clipsOnTrack } from "../../core/timeline";
import type { Clip, Id, Project, Seconds, Track } from "../../core/types";
import { effectKindMime } from "../effect-dnd";

export type EffectDragKind = "effect" | "transition";

/** Transitions snap to a cut this close to the pointer. */
export const CUT_REACH_PX = 24;

const EFFECT_DRAG_KINDS = ["effect", "transition"] as const;

/** What a library drag carries, readable during dragover (unlike the id itself). */
export const effectDragKind = (types: readonly string[]): EffectDragKind | null =>
  EFFECT_DRAG_KINDS.find((kind) => types.includes(effectKindMime(kind))) ?? null;

const clipAt = (project: Project, trackId: Id, time: Seconds): Clip | undefined =>
  clipsOnTrack(project, trackId).find((c) => time >= c.start && time < clipEnd(c));

/**
 * The clips an effect dropped at `time` on `track` lands on: the hovered clip,
 * or the whole selection when the hovered clip is part of a multi-selection.
 * Empty when nothing there can take an effect.
 */
export function effectTargets(
  project: Project,
  track: Track | null,
  time: Seconds,
  selection: readonly Id[],
): Id[] {
  if (!track || track.locked) return [];
  const clip = clipAt(project, track.id, time);
  if (!clip || clipKind(project, clip) === "audio") return [];
  return selection.length > 1 && selection.includes(clip.id) ? [...selection] : [clip.id];
}

/**
 * The cut a transition dropped at `time` on `track` lands on: the nearest one
 * within `reach` seconds, else the cut starting the hovered clip.
 */
export function cutTarget(
  project: Project,
  track: Track | null,
  time: Seconds,
  reach: Seconds,
): Cut | null {
  if (!track || track.locked || track.kind === "audio") return null;
  const cuts = cutsOnTrack(project, track.id);
  const nearest = cuts.reduce<Cut | null>(
    (best, cut) => (!best || Math.abs(cut.time - time) < Math.abs(best.time - time) ? cut : best),
    null,
  );
  if (nearest && Math.abs(nearest.time - time) <= reach) return nearest;
  const hovered = clipAt(project, track.id, time);
  return cuts.find((cut) => cut.toId === hovered?.id) ?? null;
}
