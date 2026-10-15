import type { EffectDefinition } from "../../core/types";
import { BLUR_EFFECTS } from "./blur";
import { COLOR_EFFECTS } from "./color";
import { DISTORT_EFFECTS } from "./distort";
import { REVEAL_EFFECTS } from "./reveals";
import { STYLIZE_EFFECTS } from "./stylize";
import { TRANSITIONS } from "./transitions";

/** Library order: categories are listed in the order they first appear here. */
const ALL: readonly EffectDefinition[] = [
  ...COLOR_EFFECTS,
  ...BLUR_EFFECTS,
  ...STYLIZE_EFFECTS,
  ...DISTORT_EFFECTS,
  ...REVEAL_EFFECTS,
  ...TRANSITIONS,
];

function byId(defs: readonly EffectDefinition[]): Record<string, EffectDefinition> {
  const map: Record<string, EffectDefinition> = {};
  for (const def of defs) {
    if (map[def.id]) throw new Error(`Duplicate built-in effect id "${def.id}"`);
    map[def.id] = def;
  }
  return map;
}

export const BUILTIN_EFFECTS: Readonly<Record<string, EffectDefinition>> = byId(ALL);

export const EFFECT_CATEGORIES: readonly string[] = [...new Set(ALL.map((def) => def.category))];
