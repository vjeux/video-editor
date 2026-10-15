import type { TrackKind } from "../../core/types";

export const LANE_HEIGHT: Record<TrackKind, number> = { video: 52, audio: 52, text: 38 };
export const RULER_HEIGHT = 28;

/** The horizontally visible window of the lanes, in content pixels. */
export interface Viewport {
  left: number;
  width: number;
}
