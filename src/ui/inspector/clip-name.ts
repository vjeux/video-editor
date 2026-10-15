import type { Clip, Project } from "../../core/types";

const NAMES: {
  [K in Clip["type"]]: (clip: Extract<Clip, { type: K }>, project: Project) => string;
} = {
  media: (clip, project) => project.assets[clip.assetId]?.name ?? "Missing media",
  text: (clip) => clip.text.split("\n")[0] || "Title",
  adjustment: () => "Adjustment layer",
};

/** How a clip is named in the inspector. */
export const clipName = (clip: Clip, project: Project): string =>
  (NAMES[clip.type] as (clip: Clip, project: Project) => string)(clip, project);
