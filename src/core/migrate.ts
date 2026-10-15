import { DEFAULT_MEDIA_APPEARANCE, DEFAULT_MEDIA_BORDER, DEFAULT_TEXT_SHADOW } from "./factories";
import type { Project } from "./types";

type Raw = Record<string, unknown>;

const CURRENT_VERSION = 4;

/**
 * One step per version: each takes a project of version N and returns N + 1.
 * Fields that were only *added* need no step of their own — `repair` fills
 * them — so these exist for real data transformations (none yet).
 */
const MIGRATIONS: Record<number, (project: Raw) => Raw> = {
  1: (project) => ({ ...project, version: 2 }),
  2: (project) => ({ ...project, version: 3 }),
  3: (project) => ({ ...project, version: 4 }),
};

/** Fields every clip has, with their empty values. */
const CLIP_DEFAULTS: Raw = {
  effects: [],
  transitionIn: null,
  animationIn: null,
  animationOut: null,
  animationLoop: null,
};

/** Extra fields per clip type, applied beneath the clip's own values. */
const TYPE_DEFAULTS: Record<string, Raw> = {
  media: { speedRamp: null, audioEffects: [] },
  text: { textMotion: null, karaoke: null, words: null },
  adjustment: {},
};

/** Nested objects that gained fields: merged so existing keys win. */
const NESTED_DEFAULTS: Record<string, Record<string, Raw>> = {
  media: { appearance: { ...DEFAULT_MEDIA_APPEARANCE } },
  text: {
    style: {
      stroke: null,
      // Titles always had this shadow baked in; keep it so old projects look the same.
      shadow: DEFAULT_TEXT_SHADOW,
      glow: null,
      gradient: null,
      highlight: null,
      shine: null,
    },
  },
};

/**
 * Fills anything absent with its default, whatever the version says: a
 * project can be labelled current yet contain clips written by older code
 * (e.g. an older build saving over it). Idempotent; present values win.
 */
function repair(project: Raw): Raw {
  const clips = Object.fromEntries(
    Object.entries((project.clips ?? {}) as Record<string, Raw>).map(([id, clip]) => [
      id,
      {
        ...CLIP_DEFAULTS,
        ...TYPE_DEFAULTS[clip.type as string],
        ...clip,
        ...Object.fromEntries(
          Object.entries(NESTED_DEFAULTS[clip.type as string] ?? {}).map(([key, defaults]) => [
            key,
            key === "appearance"
              ? repairAppearance(clip[key] as Raw | undefined)
              : { ...defaults, ...(clip[key] as Raw) },
          ]),
        ),
      },
    ]),
  );
  return { ...project, customEffects: project.customEffects ?? {}, clips };
}

function repairAppearance(raw: Raw | undefined): Raw {
  const appearance = { ...DEFAULT_MEDIA_APPEARANCE, ...raw } as Raw;
  for (const key of ["padding", "crop", "position", "mask"] as const) {
    const value = appearance[key];
    if (value && typeof value === "object" && !Array.isArray(value))
      appearance[key] = { ...DEFAULT_MEDIA_APPEARANCE[key], ...value };
  }
  if (
    appearance.border &&
    typeof appearance.border === "object" &&
    !Array.isArray(appearance.border)
  )
    appearance.border = { ...DEFAULT_MEDIA_BORDER, ...appearance.border };
  return appearance;
}

/** Upgrades a saved project to the current schema, failing on unknown versions. */
export function migrateProject(raw: unknown): Project {
  let project = raw as Raw;
  while (project.version !== CURRENT_VERSION) {
    const step = MIGRATIONS[project.version as number];
    if (!step) throw new Error(`Unsupported project version ${String(project.version)}`);
    project = step(project);
  }
  return repair(project) as unknown as Project;
}
