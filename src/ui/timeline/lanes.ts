import type { TrackKind } from "../../core/types";

/** Room for a clip's label, its art and the effect chip strip. */
export const LANE_HEIGHT: Record<TrackKind, number> = { video: 56, audio: 56, text: 46 };
export const RULER_HEIGHT = 28;

/** The horizontally visible window of the lanes, in content pixels. */
export interface Viewport {
  left: number;
  width: number;
}
