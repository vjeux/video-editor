import { suggestProjectFps } from "./frame-rates";
import type { Asset, Project } from "./types";

/** Longest canvas edge a project adopts from its footage. */
export const MAX_PROJECT_EDGE = 3840;

/**
 * "New sequence from clip": the first video on an empty timeline sets the
 * canvas to its size (scaled into MAX_PROJECT_EDGE) and the project to its
 * frame rate when that is one of the listed rates.
 */
export function adoptSourceFormat(project: Project, asset: Asset): Project {
  if (Object.keys(project.clips).length > 0 || asset.kind === "audio" || !asset.width) {
    return project;
  }
  const scale = Math.min(1, MAX_PROJECT_EDGE / Math.max(asset.width, asset.height));
  const even = (n: number) => Math.round((n * scale) / 2) * 2;
  const fps = suggestProjectFps(asset.frameRate ?? null) ?? project.settings.fps;
  return {
    ...project,
    settings: { ...project.settings, width: even(asset.width), height: even(asset.height), fps },
  };
}
