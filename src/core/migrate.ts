import type { Project } from "./types";

type Raw = Record<string, unknown>;

const CURRENT_VERSION = 2;

/** One step per version: each takes a project of version N and returns version N + 1. */
const MIGRATIONS: Record<number, (project: Raw) => Raw> = {
  1: (project) => ({
    ...project,
    version: 2,
    customEffects: {},
    clips: Object.fromEntries(
      Object.entries(project.clips as Record<string, Raw>).map(([id, clip]) => [
        id,
        { ...clip, effects: [], transitionIn: null, animationIn: null, animationOut: null },
      ]),
    ),
  }),
};

/** Upgrades a saved project to the current schema, failing on unknown versions. */
export function migrateProject(raw: unknown): Project {
  let project = raw as Raw;
  while (project.version !== CURRENT_VERSION) {
    const step = MIGRATIONS[project.version as number];
    if (!step) throw new Error(`Unsupported project version ${String(project.version)}`);
    project = step(project);
  }
  return project as unknown as Project;
}
