import { findEffect } from "../../app/effects";
import { definitionFromSource } from "../../core/shader-source";
import type { EffectDefinition, Project } from "../../core/types";
import { BUILTIN_EFFECTS } from "../../effects/library";
import type { StudioTarget } from "../../store/studio";
import { DEFAULT_NAMES, TEMPLATES } from "./templates";

type CustomEffects = Project["customEffects"];

/** The form fields that override the source's `@name`/`@category`/`@description` tags. */
export interface StudioMeta {
  name: string;
  category: string;
  description: string;
}

/** Where a studio session starts: the id it saves under and the initial contents. */
export interface StudioDraft extends StudioMeta {
  id: string;
  /** True when editing an effect already in the project (export and delete apply). */
  saved: boolean;
  source: string;
  /** Carried over from the original so editing a LUT effect keeps its table. */
  lut: EffectDefinition["lut"];
  author: string;
}

const newCustomId = () => `custom-${crypto.randomUUID()}`;

export function initialDraft(target: StudioTarget, customEffects: CustomEffects): StudioDraft {
  if (target.mode === "new") {
    return {
      id: newCustomId(),
      saved: false,
      source: TEMPLATES[target.kind],
      name: DEFAULT_NAMES[target.kind],
      category: "Custom",
      description: "",
      lut: null,
      author: "",
    };
  }
  const base = findEffect(target.effectId);
  if (!base) throw new Error(`Unknown effect ${target.effectId}`);
  // Built-ins are read-only: "editing" one starts a copy.
  const editable = target.mode === "edit" && Object.hasOwn(customEffects, base.id);
  return {
    id: editable ? base.id : newCustomId(),
    saved: editable,
    source: base.source,
    name: editable ? base.name : `${base.name} copy`,
    category: base.category,
    description: base.description,
    lut: base.lut,
    author: base.author,
  };
}

/** Parses the draft's source, then lets the form fields win over its metadata tags. */
export function draftDefinition(
  draft: Pick<StudioDraft, "id" | "lut" | "author">,
  source: string,
  meta: StudioMeta,
): EffectDefinition {
  const parsed = definitionFromSource(source, draft.id);
  return {
    ...parsed,
    name: meta.name.trim() || parsed.name,
    category: meta.category.trim() || parsed.category,
    description: meta.description.trim() || parsed.description,
    author: parsed.author || draft.author,
    lut: draft.lut,
  };
}

/** Every category in use, for the category field's suggestions. */
export const effectCategories = (customEffects: CustomEffects): string[] =>
  [
    ...new Set(
      [...Object.values(BUILTIN_EFFECTS), ...Object.values(customEffects)].map((d) => d.category),
    ),
  ].sort((a, b) => a.localeCompare(b));

/** Identifies a studio session, so retargeting the open studio starts afresh. */
export const studioKey = (target: StudioTarget): string =>
  target.mode === "new" ? `new:${target.kind}` : `${target.mode}:${target.effectId}`;
