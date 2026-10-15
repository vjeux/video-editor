import type { EffectDefinition, Project } from "../core/types";
import { BUILTIN_EFFECTS } from "./library";

/** Project-defined effects shadow built-ins with the same id. */
type EffectScope = Pick<Project, "customEffects">;

export const resolveEffect = (project: EffectScope, id: string): EffectDefinition | undefined =>
  project.customEffects[id] ?? BUILTIN_EFFECTS[id];

export const allEffects = (project: EffectScope): EffectDefinition[] => [
  ...Object.values(BUILTIN_EFFECTS),
  ...Object.values(project.customEffects),
];
