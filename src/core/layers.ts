import type { Clip, Project, Seconds, TransitionInstance } from "./types";

export type Layer =
  | { kind: "clip"; clip: Clip }
  | { kind: "transition"; from: Clip; to: Clip; transition: TransitionInstance; progress: number };

export const layersAt = (_p: Project, _t: Seconds): Layer[] => {
  throw new Error("not implemented");
};
