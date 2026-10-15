import { validateEffect } from "../../app/effects";
import { definitionFromSource } from "../../core/shader-source";
import type { EffectDefinition } from "../../core/types";
import { ShaderCompileError, type ShaderError } from "../../engine/gpu";

/** The outcome of parsing and compiling one version of the source. */
export interface Analysis {
  source: string;
  /** Null when the source has no entry point to parse. */
  def: EffectDefinition | null;
  /** Empty when the shader compiled. */
  errors: readonly ShaderError[];
}

export const errorsOf = (error: unknown): ShaderError[] =>
  error instanceof ShaderCompileError
    ? error.errors
    : [{ line: null, message: error instanceof Error ? error.message : String(error) }];

/**
 * Parses and compiles `source` on the studio GPU. Compiled programs are cached
 * by the GPU per source, so repeating an analysis is cheap.
 */
export function analyzeSource(source: string, id: string, lut: EffectDefinition["lut"]): Analysis {
  let def: EffectDefinition | null = null;
  try {
    def = { ...definitionFromSource(source, id), lut };
    validateEffect(def);
    return { source, def, errors: [] };
  } catch (error) {
    return { source, def, errors: errorsOf(error) };
  }
}

/** One line for the footer when saving fails; the details show inline. */
export function saveFailureMessage(error: unknown): string {
  if (!(error instanceof ShaderCompileError))
    return errorsOf(error)[0]?.message ?? "Could not save";
  const count = error.errors.length;
  return `Fix ${count === 1 ? "the compile error" : `${count} compile errors`} to save`;
}
