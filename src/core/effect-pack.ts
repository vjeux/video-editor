import type { EffectDefinition, IdFactory } from "./types";

export const serializeEffectPack = (_defs: readonly EffectDefinition[]): string => {
  throw new Error("not implemented");
};

export const parseEffectPack = (_json: string, _newId: IdFactory): EffectDefinition[] => {
  throw new Error("not implemented");
};
