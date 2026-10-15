import { snapCandidates, snapTime } from "../../core/timeline";
import type { Id, Project, Track } from "../../core/types";
import { editorStore } from "../../store";
import { LANE_HEIGHT, RULER_HEIGHT } from "./lanes";

const SNAP_PX = 8;

/** The track whose lane contains content-space `y`, or null over the ruler / below the last lane. */
export function trackAtY(project: Project, y: number): Track | null {
  let top = RULER_HEIGHT;
  for (const track of project.tracks) {
    const h = LANE_HEIGHT[track.kind];
    if (y >= top && y < top + h) return track;
    top += h;
  }
  return null;
}

/** Snaps `t` (and optionally a span ending at `t + length`) to nearby edges. */
export function snap(project: Project, t: number, exclude: Id[], length = 0) {
  const { snapping, pxPerSecond, playhead } = editorStore.getState();
  if (!snapping) return { time: t, snapAt: null };
  const candidates = snapCandidates(project, { exclude, playhead });
  const threshold = SNAP_PX / pxPerSecond;
  const head = snapTime(t, candidates, threshold);
  const tail =
    length > 0 ? snapTime(t + length, candidates, threshold) : { time: 0, snapped: false };
  if (
    head.snapped &&
    (!tail.snapped || Math.abs(head.time - t) <= Math.abs(tail.time - t - length))
  ) {
    return { time: head.time, snapAt: head.time };
  }
  if (tail.snapped) return { time: tail.time - length, snapAt: tail.time };
  return { time: t, snapAt: null };
}
