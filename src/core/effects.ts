import type {
  EffectDefinition,
  EffectInstance,
  Id,
  IdFactory,
  Params,
  Project,
  Seconds,
} from "./types";

const todo = (): never => {
  throw new Error("not implemented");
};

export interface Cut {
  fromId: Id;
  toId: Id;
  time: Seconds;
}

export const createEffectInstance = (_def: EffectDefinition, _id: Id): EffectInstance => todo();
export const addEffect = (
  _p: Project,
  _clipIds: readonly Id[],
  _def: EffectDefinition,
  _newId: IdFactory,
): Project => todo();
export const updateEffect = (
  _p: Project,
  _clipId: Id,
  _effectId: Id,
  _patch: { enabled?: boolean; params?: Params },
): Project => todo();
export const removeEffect = (_p: Project, _clipId: Id, _effectId: Id): Project => todo();
export const moveEffect = (_p: Project, _clipId: Id, _effectId: Id, _index: number): Project =>
  todo();
export const cutsOnTrack = (_p: Project, _trackId: Id): Cut[] => todo();
export const setTransition = (
  _p: Project,
  _clipId: Id,
  _def: EffectDefinition | null,
  _duration?: Seconds,
): Project => todo();
export const addCustomEffect = (_p: Project, _def: EffectDefinition): Project => todo();
export const removeCustomEffect = (_p: Project, _id: string): Project => todo();
