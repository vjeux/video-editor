import { definitionFromSource } from "./shader-source";
import type { EffectDefinition, IdFactory } from "./types";

const FORMAT = "cutline-effects";
const VERSION = 1;

type PackEntry = Omit<EffectDefinition, "id" | "params">;

/** A portable `.json` file of effects: sources and metadata, never ids or parameter tables. */
export function serializeEffectPack(defs: readonly EffectDefinition[]): string {
  const effects: PackEntry[] = defs.map(
    ({ name, kind, category, description, author, source, lut }) => ({
      name,
      kind,
      category,
      description,
      author,
      source,
      lut,
    }),
  );
  return JSON.stringify({ format: FORMAT, version: VERSION, effects }, null, 2);
}

const isLut = (value: unknown): value is EffectDefinition["lut"] =>
  value === null ||
  (typeof value === "object" &&
    typeof (value as { size?: unknown }).size === "number" &&
    typeof (value as { data?: unknown }).data === "string");

/**
 * Reads an effect pack. Parameters are re-derived from each source so a file
 * can't declare uniforms its shader doesn't have; every effect gets a fresh id.
 */
export function parseEffectPack(json: string, newId: IdFactory): EffectDefinition[] {
  const data = JSON.parse(json) as { format?: unknown; effects?: unknown };
  if (data?.format !== FORMAT || !Array.isArray(data.effects)) {
    throw new Error("This file is not a Cutline effect pack");
  }
  return data.effects.map((raw: Partial<Record<keyof PackEntry, unknown>>) => {
    if (typeof raw.source !== "string")
      throw new Error("An effect in the pack has no shader source");
    const def = definitionFromSource(raw.source, newId());
    const text = (value: unknown, fallback: string) =>
      typeof value === "string" ? value : fallback;
    return {
      ...def,
      name: text(raw.name, def.name),
      category: text(raw.category, def.category),
      description: text(raw.description, def.description),
      author: text(raw.author, def.author),
      lut: isLut(raw.lut) ? raw.lut : null,
    };
  });
}
