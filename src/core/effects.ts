import { clipEnd, clipsOnTrack, findClip } from "./timeline";
import type {
  Clip,
  EffectDefinition,
  EffectInstance,
  Id,
  IdFactory,
  Params,
  Project,
  Seconds,
} from "./types";

/** Clip edges closer than this are considered touching. */
const EPSILON = 1e-6;

export interface Cut {
  fromId: Id;
  toId: Id;
  time: Seconds;
}

export const defaultParams = (def: EffectDefinition): Params =>
  Object.fromEntries(def.params.map((p) => [p.key, p.default]));

export function createEffectInstance(def: EffectDefinition, id: Id): EffectInstance {
  return { id, effectId: def.id, enabled: true, params: defaultParams(def) };
}

function updateClip(project: Project, clipId: Id, fn: (clip: Clip) => Clip): Project {
  const clip = findClip(project, clipId);
  return { ...project, clips: { ...project.clips, [clipId]: fn(clip) } };
}

const mapEffects = (
  project: Project,
  clipId: Id,
  fn: (effects: readonly EffectInstance[]) => EffectInstance[],
) => updateClip(project, clipId, (clip) => ({ ...clip, effects: fn(clip.effects) }));

export function addEffect(
  project: Project,
  clipIds: readonly Id[],
  def: EffectDefinition,
  newId: IdFactory,
): Project {
  if (def.kind !== "effect") throw new Error(`${def.name} is a transition, not an effect`);
  const locked = new Set(project.tracks.filter((t) => t.locked).map((t) => t.id));
  return clipIds
    .filter((id) => !locked.has(findClip(project, id).trackId))
    .reduce(
      (acc, id) =>
        mapEffects(acc, id, (effects) => [...effects, createEffectInstance(def, newId())]),
      project,
    );
}

export function updateEffect(
  project: Project,
  clipId: Id,
  effectId: Id,
  patch: { enabled?: boolean; params?: Params },
): Project {
  return mapEffects(project, clipId, (effects) =>
    effects.map((e) =>
      e.id === effectId
        ? { ...e, enabled: patch.enabled ?? e.enabled, params: { ...e.params, ...patch.params } }
        : e,
    ),
  );
}

export const removeEffect = (project: Project, clipId: Id, effectId: Id): Project =>
  mapEffects(project, clipId, (effects) => effects.filter((e) => e.id !== effectId));

export function moveEffect(project: Project, clipId: Id, effectId: Id, index: number): Project {
  return mapEffects(project, clipId, (effects) => {
    const moving = effects.find((e) => e.id === effectId);
    if (!moving) return [...effects];
    const rest = effects.filter((e) => e.id !== effectId);
    rest.splice(Math.max(0, Math.min(index, rest.length)), 0, moving);
    return rest;
  });
}

/** The clip ending exactly where `clip` starts on the same track, if any. */
export function previousAdjacent(project: Project, clip: Clip): Clip | undefined {
  return clipsOnTrack(project, clip.trackId).find(
    (c) => c.id !== clip.id && Math.abs(clipEnd(c) - clip.start) < EPSILON,
  );
}

export function cutsOnTrack(project: Project, trackId: Id): Cut[] {
  const clips = clipsOnTrack(project, trackId);
  return clips.flatMap((from, i) => {
    const to = clips[i + 1];
    return to && Math.abs(clipEnd(from) - to.start) < EPSILON
      ? [{ fromId: from.id, toId: to.id, time: to.start }]
      : [];
  });
}

/** Puts a transition on the cut into `clipId` (or clears it with `null`). */
export function setTransition(
  project: Project,
  clipId: Id,
  def: EffectDefinition | null,
  duration: Seconds = 1,
): Project {
  if (!def) return updateClip(project, clipId, (clip) => ({ ...clip, transitionIn: null }));
  if (def.kind !== "transition") throw new Error(`${def.name} is an effect, not a transition`);
  const clip = findClip(project, clipId);
  const previous = previousAdjacent(project, clip);
  if (!previous) throw new Error("A transition needs an adjacent clip before it on the same track");
  const keep =
    clip.transitionIn?.effectId === def.id ? clip.transitionIn.params : defaultParams(def);
  const length = Math.max(0, Math.min(duration, previous.duration, clip.duration));
  return updateClip(project, clipId, (c) => ({
    ...c,
    transitionIn: { effectId: def.id, duration: length, params: keep },
  }));
}

export const addCustomEffect = (project: Project, def: EffectDefinition): Project => ({
  ...project,
  customEffects: { ...project.customEffects, [def.id]: def },
});

/** Deletes a custom definition and every effect or transition that used it. */
export function removeCustomEffect(project: Project, id: string): Project {
  const { [id]: _removed, ...customEffects } = project.customEffects;
  const clips = Object.fromEntries(
    Object.entries(project.clips).map(([key, clip]) => [
      key,
      {
        ...clip,
        effects: clip.effects.filter((e) => e.effectId !== id),
        transitionIn: clip.transitionIn?.effectId === id ? null : clip.transitionIn,
      },
    ]),
  );
  return { ...project, customEffects, clips };
}
