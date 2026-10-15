import type { ClipKind, Id, IdFactory, Project, TrackKind } from "./types";

const todo = (): never => {
  throw new Error("not implemented");
};

export const addTrack = (
  _p: Project,
  _kind: TrackKind,
  _id: Id,
): { project: Project; trackId: Id } => todo();
export const trackFor = (
  _p: Project,
  _kind: ClipKind,
  _newId: IdFactory,
): { project: Project; trackId: Id } => todo();
export const removeTrack = (_p: Project, _trackId: Id): Project => todo();
export const trackLabel = (_p: Project, _trackId: Id): string => todo();
