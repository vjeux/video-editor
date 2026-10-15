import { setAnimation } from "../core/clip-animations";
import { parseEffectPack, serializeEffectPack } from "../core/effect-pack";
import {
  addCustomEffect,
  addEffect,
  cutsOnTrack,
  moveEffect,
  removeCustomEffect,
  removeEffect,
  setTransition,
  updateEffect,
} from "../core/effects";
import { createAdjustmentClip } from "../core/factories";
import { lutDefinition, parseCubeLut } from "../core/lut";
import { definitionFromSource } from "../core/shader-source";
import { placeClip } from "../core/timeline";
import { trackFor } from "../core/tracks";
import type { ClipAnimation, EffectDefinition, Id, Params, Project } from "../core/types";
import type { Drawable } from "../engine/compositor";
import { createGpu, type GpuEffects } from "../engine/gpu";
import { resolveEffect } from "../effects/resolve";
import { editorStore } from "../store";
import { noticeStore } from "../store/notices";
import { newId } from "./engine";
import { reportError } from "./errors";

const state = () => editorStore.getState();

let gpu: GpuEffects | null | undefined;
/** One GPU context for validating shaders and drawing previews outside the viewer. */
export function studioGpu(): GpuEffects | null {
  gpu ??= createGpu(reportError);
  return gpu;
}

export const findEffect = (id: string) => resolveEffect(state().project, id);

function requireEffect(id: string): EffectDefinition {
  const def = findEffect(id);
  if (!def) throw new Error(`Unknown effect ${id}`);
  return def;
}

const selectedOr = (clipIds?: readonly Id[]) => clipIds ?? state().selection;

export function applyEffect(effectId: string, clipIds?: readonly Id[]) {
  const ids = selectedOr(clipIds);
  if (ids.length === 0) {
    noticeStore.getState().push("info", "Select a clip first, or drag the effect onto one");
    return;
  }
  state().commit((p) => addEffect(p, ids, requireEffect(effectId), newId));
}

export const updateEffectParams = (clipId: Id, instanceId: Id, params: Params, coalesce?: string) =>
  state().commit((p) => updateEffect(p, clipId, instanceId, { params }), { coalesce });

export const toggleEffect = (clipId: Id, instanceId: Id, enabled: boolean) =>
  state().commit((p) => updateEffect(p, clipId, instanceId, { enabled }));

export const removeEffectFrom = (clipId: Id, instanceId: Id) =>
  state().commit((p) => removeEffect(p, clipId, instanceId));

export const reorderEffect = (clipId: Id, instanceId: Id, index: number) =>
  state().commit((p) => moveEffect(p, clipId, instanceId, index));

/** Puts a transition on the cut into `clipId` and selects it. */
export function applyTransition(clipId: Id, effectId: string, duration = 1) {
  state().commit((p) => setTransition(p, clipId, requireEffect(effectId), duration));
  state().focusTransition(clipId);
}

/** Applies a transition to every cut, on one track or the whole timeline. */
export function applyTransitionToAllCuts(effectId: string, trackId?: Id) {
  const def = requireEffect(effectId);
  state().commit((p) =>
    p.tracks
      .filter((t) => (trackId ? t.id === trackId : t.kind !== "audio") && !t.locked)
      .flatMap((t) => cutsOnTrack(p, t.id))
      .reduce((acc, cut) => setTransition(acc, cut.toId, def, 1), p),
  );
}

export const clearTransition = (clipId: Id) =>
  state().commit((p) => setTransition(p, clipId, null));

export function updateTransition(
  clipId: Id,
  patch: { duration?: number; params?: Params },
  coalesce?: string,
) {
  state().commit(
    (p) => {
      const clip = p.clips[clipId];
      const transition = clip?.transitionIn;
      if (!clip || !transition) return p;
      const def = requireEffect(transition.effectId);
      const resized =
        patch.duration === undefined ? p : setTransition(p, clipId, def, patch.duration);
      const current = resized.clips[clipId]?.transitionIn ?? transition;
      const next = { ...current, params: { ...current.params, ...patch.params } };
      return { ...resized, clips: { ...resized.clips, [clipId]: { ...clip, transitionIn: next } } };
    },
    { coalesce },
  );
}

export const setClipAnimation = (
  clipId: Id,
  which: "in" | "out",
  animation: ClipAnimation | null,
  coalesce?: string,
) => state().commit((p) => setAnimation(p, clipId, which, animation), { coalesce });

/** Adds an adjustment layer above the footage at the playhead and selects it. */
export function addAdjustmentLayer(effectId?: string) {
  const id = newId();
  state().commit((p) => {
    const target = trackFor(p, "adjustment", newId);
    const clip = createAdjustmentClip({ id, trackId: target.trackId, start: state().playhead });
    const placed = placeClip(target.project, clip, newId);
    return effectId ? addEffect(placed, [id], requireEffect(effectId), newId) : placed;
  });
  state().select([id]);
}

/** Compiles a definition on the GPU; throws ShaderCompileError with line numbers. */
export function validateEffect(def: EffectDefinition) {
  studioGpu()?.validate(def);
}

/** Saves (or replaces) a user effect after it compiles. */
export function saveCustomEffect(def: EffectDefinition) {
  validateEffect(def);
  state().commit((p) => addCustomEffect(p, def));
}

export const deleteCustomEffect = (id: string) => state().commit((p) => removeCustomEffect(p, id));

const EFFECT_FILE = /\.(glsl|frag|fs|cube|json)$/i;
export const isEffectFile = (file: File) => EFFECT_FILE.test(file.name);

type Importer = (text: string, file: File) => EffectDefinition[];

/** Parsers by file extension; every result gets a fresh custom id. */
const IMPORTERS: Record<string, Importer> = {
  glsl: (text, file) => [definitionFromSource(text, `custom-${newId()}`, file.name)],
  frag: (text, file) => IMPORTERS.glsl!(text, file),
  fs: (text, file) => IMPORTERS.glsl!(text, file),
  cube: (text, file) => [lutDefinition(parseCubeLut(text), `custom-${newId()}`, file.name)],
  json: (text) => parseEffectPack(text, () => `custom-${newId()}`),
};

/** Imports shaders, LUTs and effect packs; each effect must compile before it's added. */
export async function importEffectFiles(files: Iterable<File>): Promise<EffectDefinition[]> {
  const imported: EffectDefinition[] = [];
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const importer = IMPORTERS[extension];
    try {
      if (!importer) throw new Error(`${file.name}: not an effect file`);
      const defs = importer(await file.text(), file);
      defs.forEach(validateEffect);
      imported.push(...defs);
    } catch (error) {
      reportError(new Error(`Could not import ${file.name}: ${(error as Error).message}`));
    }
  }
  if (imported.length) {
    state().commit((p: Project) => imported.reduce(addCustomEffect, p));
    noticeStore.getState().push("info", `Imported ${imported.map((d) => d.name).join(", ")}`);
  }
  return imported;
}

/** Downloads custom effects as a portable effect pack. */
export function exportEffects(ids: readonly string[], fileName = "effects") {
  const defs = ids.flatMap((id) => findEffect(id) ?? []);
  const blob = new Blob([serializeEffectPack(defs)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `${fileName}.cutline-effects.json`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Renders an effect or transition over sample images (for thumbnails and the studio). */
export function previewEffect(
  def: EffectDefinition,
  from: Drawable,
  to: Drawable,
  { progress = 0.5, time = 0, params }: { progress?: number; time?: number; params?: Params } = {},
): Drawable | null {
  const gpuEffects = studioGpu();
  if (!gpuEffects) return null;
  const pass = {
    definition: def,
    params: params ?? Object.fromEntries(def.params.map((p) => [p.key, p.default])),
    progress,
    time,
    resolution: [from.width, from.height] as const,
  };
  return def.kind === "transition"
    ? gpuEffects.transition(from, to, pass)
    : gpuEffects.apply(from, [pass]);
}
