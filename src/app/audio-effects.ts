import {
  addAudioEffect,
  AUDIO_EFFECTS,
  moveAudioEffect,
  removeAudioEffect,
  updateAudioEffect,
} from "../core/audio-effects";
import type { Id, Params } from "../core/types";
import { editorStore } from "../store";
import { noticeStore } from "../store/notices";
import { newId } from "./engine";

const state = () => editorStore.getState();

export function applyAudioEffect(effectId: string, clipIds?: readonly Id[]) {
  const def = AUDIO_EFFECTS[effectId];
  if (!def) throw new Error(`Unknown audio effect ${effectId}`);
  const ids = clipIds ?? state().selection;
  if (ids.length === 0) {
    noticeStore.getState().push("info", "Select a clip with sound first");
    return;
  }
  state().commit((p) => addAudioEffect(p, ids, def, newId));
}

export const updateAudioEffectParams = (
  clipId: Id,
  instanceId: Id,
  params: Params,
  coalesce?: string,
) => state().commit((p) => updateAudioEffect(p, clipId, instanceId, { params }), { coalesce });

export const toggleAudioEffect = (clipId: Id, instanceId: Id, enabled: boolean) =>
  state().commit((p) => updateAudioEffect(p, clipId, instanceId, { enabled }));

export const removeAudioEffectFrom = (clipId: Id, instanceId: Id) =>
  state().commit((p) => removeAudioEffect(p, clipId, instanceId));

export const reorderAudioEffect = (clipId: Id, instanceId: Id, index: number) =>
  state().commit((p) => moveAudioEffect(p, clipId, instanceId, index));

/** Sets or clears a clip's velocity ramp. */
export function setSpeedRamp(clipId: Id, rampId: string | null) {
  state().commit((p) => {
    const clip = p.clips[clipId];
    return clip?.type === "media"
      ? { ...p, clips: { ...p.clips, [clipId]: { ...clip, speedRamp: rampId } } }
      : p;
  });
}
