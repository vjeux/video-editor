import type { Clip, ClipKind, Id, IdFactory, MediaClip, Project, Seconds } from "./types";

const todo = (): never => {
  throw new Error("not implemented");
};

export const placeClip = (_p: Project, _clip: Clip, _newId: IdFactory): Project => todo();
export const canPlace = (_p: Project, _kind: ClipKind, _trackId: Id): boolean => todo();
export const moveClip = (
  _p: Project,
  _id: Id,
  _to: { start: Seconds; trackId: Id },
  _newId: IdFactory,
): Project => todo();
export const trimClip = (_p: Project, _id: Id, _edge: "start" | "end", _time: Seconds): Project =>
  todo();
export const splitClip = (_p: Project, _id: Id, _time: Seconds, _newId: IdFactory): Project =>
  todo();
export const splitAtTime = (
  _p: Project,
  _time: Seconds,
  _newId: IdFactory,
  _only?: readonly Id[],
): Project => todo();
export const removeClips = (
  _p: Project,
  _ids: readonly Id[],
  _opts?: { ripple?: boolean },
): Project => todo();
export const removeAsset = (_p: Project, _assetId: Id): Project => todo();
export const projectDuration = (_p: Project): Seconds => todo();
export const trackEnd = (_p: Project, _trackId: Id): Seconds => todo();
export const maxClipDuration = (_p: Project, _clip: Clip): Seconds => todo();
export const visualLayers = (_p: Project, _t: Seconds): Clip[] => todo();
export const audibleClips = (_p: Project): MediaClip[] => todo();
export const snapTime = (
  _t: Seconds,
  _candidates: readonly Seconds[],
  _threshold: Seconds,
): { time: Seconds; snapped: boolean } => todo();
export const snapCandidates = (
  _p: Project,
  _opts: { exclude: readonly Id[]; playhead: Seconds },
): Seconds[] => todo();
