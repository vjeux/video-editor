import type { EffectInstance, Project } from "../../core/types";
import { resolveEffect } from "../../effects/resolve";

const MISSING = "Missing effect";

export const effectName = (project: Project, effectId: string): string =>
  resolveEffect(project, effectId)?.name ?? MISSING;

export const effectNames = (project: Project, effects: readonly EffectInstance[]): string[] =>
  effects.map((e) => effectName(project, e.effectId));
