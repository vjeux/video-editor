import type { EffectInstance, Id, IdFactory, ParamDef, Params, Project } from "./types";

export interface AudioEffectDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  params: readonly ParamDef[];
}

const todo = (): never => {
  throw new Error("not implemented");
};

export const AUDIO_EFFECTS: Readonly<Record<string, AudioEffectDefinition>> = {};
export const addAudioEffect = (
  _p: Project,
  _ids: readonly Id[],
  _def: AudioEffectDefinition,
  _newId: IdFactory,
): Project => todo();
export const updateAudioEffect = (
  _p: Project,
  _clipId: Id,
  _id: Id,
  _patch: { enabled?: boolean; params?: Params },
): Project => todo();
export const removeAudioEffect = (_p: Project, _clipId: Id, _id: Id): Project => todo();
export const moveAudioEffect = (_p: Project, _clipId: Id, _id: Id, _index: number): Project =>
  todo();
export type { EffectInstance };
