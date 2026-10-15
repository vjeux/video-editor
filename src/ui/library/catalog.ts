import type { EffectDefinition, EffectKind } from "../../core/types";
import { BUILTIN_EFFECTS, EFFECT_CATEGORIES } from "../../effects/library";

export const ALL = "All";

/** Built-ins plus project effects of one kind; project effects shadow built-ins (as `resolveEffect` does). */
export const definitionsOf = (
  customEffects: Readonly<Record<string, EffectDefinition>>,
  kind: EffectKind,
): EffectDefinition[] =>
  Object.values({ ...BUILTIN_EFFECTS, ...customEffects }).filter((d) => d.kind === kind);

/** Chip options: built-in categories in library order, then project ones (Custom, Imported, LUT…). */
export function categoriesOf(definitions: readonly EffectDefinition[]): string[] {
  const present = new Set(definitions.map((d) => d.category));
  const builtin = EFFECT_CATEGORIES.filter((c) => present.has(c));
  const extra = [...present].filter((c) => !builtin.includes(c)).toSorted();
  return [ALL, ...builtin, ...extra];
}

export function matchesDefinition(def: EffectDefinition, category: string, query: string) {
  const needle = query.trim().toLowerCase();
  return (
    (category === ALL || def.category === category) &&
    `${def.name} ${def.category} ${def.description}`.toLowerCase().includes(needle)
  );
}

/** Stand-in for a thumbnail when WebGL2 is unavailable. */
export const initialOf = (text: string) => text.trim().charAt(0).toUpperCase() || "?";
