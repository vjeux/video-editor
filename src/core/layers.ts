import { previousAdjacent } from "./effects";
import { clipEnd, clipsOnTrack } from "./timeline";
import type { Clip, Project, Seconds, TransitionInstance } from "./types";

export type Layer =
  | { kind: "clip"; clip: Clip }
  | { kind: "transition"; from: Clip; to: Clip; transition: TransitionInstance; progress: number };

/** A transition's live window, centred on the cut; null while its clips don't touch. */
export function transitionWindow(project: Project, clip: Clip) {
  const transition = clip.transitionIn;
  if (!transition || transition.duration <= 0) return null;
  const from = previousAdjacent(project, clip);
  if (!from) return null;
  const duration = Math.min(transition.duration, from.duration, clip.duration);
  return { from, to: clip, transition, start: clip.start - duration / 2, duration };
}

function trackLayersAt(project: Project, clips: readonly Clip[], t: Seconds): Layer[] {
  for (const clip of clips) {
    const window = transitionWindow(project, clip);
    if (window && t >= window.start && t < window.start + window.duration) {
      const { from, to, transition } = window;
      return [
        {
          kind: "transition",
          from,
          to,
          transition,
          progress: (t - window.start) / window.duration,
        },
      ];
    }
  }
  return clips
    .filter((c) => t >= c.start && t < clipEnd(c))
    .map((clip) => ({ kind: "clip", clip }));
}

/** Everything visible at `t`, bottom (drawn first) to top. */
export function layersAt(project: Project, t: Seconds): Layer[] {
  return project.tracks
    .filter((track) => track.kind !== "audio" && !track.hidden)
    .toReversed()
    .flatMap((track) => trackLayersAt(project, clipsOnTrack(project, track.id), t));
}

/** The clips a layer draws (one, or both sides of a transition). */
export const layerClips = (layer: Layer): Clip[] =>
  layer.kind === "clip" ? [layer.clip] : [layer.from, layer.to];
