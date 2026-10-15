import type { EffectDefinition, EffectKind } from "../../core/types";
import { studioStore } from "../../store/studio";

/** DataTransfer type carrying an effect instance id while reordering a clip's stack. */
export const INSTANCE_MIME = "application/x-cutline-effect-instance";

/** Index for `reorderEffect` when the item at `from` is dropped into gap `slot` (0…length). */
export const indexForSlot = (from: number, slot: number) => (slot > from ? slot - 1 : slot);

/** Which gap (`index` or `index + 1`) a pointer at `y` over an item points to. */
export function slotAt(index: number, y: number, rect: { top: number; height: number }) {
  return y > rect.top + rect.height / 2 ? index + 1 : index;
}

export interface EffectCategory {
  name: string;
  effects: EffectDefinition[];
}

const matches = (def: EffectDefinition, query: string) =>
  `${def.name} ${def.category} ${def.description}`.toLowerCase().includes(query);

/** Definitions of one kind matching `query`, grouped by category in library order. */
export function groupByCategory(
  defs: readonly EffectDefinition[],
  kind: EffectKind,
  query: string,
): EffectCategory[] {
  const q = query.trim().toLowerCase();
  const groups = new Map<string, EffectDefinition[]>();
  for (const def of defs) {
    if (def.kind !== kind || !matches(def, q)) continue;
    groups.set(def.category, [...(groups.get(def.category) ?? []), def]);
  }
  return [...groups].map(([name, effects]) => ({ name, effects }));
}

/** Custom effects open for editing; built-ins open as an editable copy. */
export const openInStudio = (effectId: string, custom: boolean) =>
  studioStore.getState().open({ mode: custom ? "edit" : "duplicate", effectId });

export const studioLabel = (custom: boolean) =>
  custom ? "Edit in Studio" : "Edit a copy in Studio";
