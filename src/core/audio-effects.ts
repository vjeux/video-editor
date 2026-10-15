import { findClip } from "./timeline";
import type { EffectInstance, Id, IdFactory, MediaClip, ParamDef, Params, Project } from "./types";

/** A Web Audio effect: parameters are data here; the engine builds its node graph by id. */
export interface AudioEffectDefinition {
  id: string;
  name: string;
  category: "Fix" | "Voice" | "Space" | "Character" | "Mix";
  description: string;
  params: readonly ParamDef[];
}

const float = (
  key: string,
  label: string,
  def: number,
  min: number,
  max: number,
  step?: number,
): ParamDef => ({
  key,
  label,
  type: "float",
  default: def,
  min,
  max,
  ...(step !== undefined && { step }),
});

const effect = (
  id: string,
  name: string,
  category: AudioEffectDefinition["category"],
  description: string,
  params: ParamDef[],
): AudioEffectDefinition => ({ id, name, category, description, params });

/** Ordered roughly by how often creators reach for them: fix the voice, then add character. */
export const AUDIO_EFFECTS: Readonly<Record<string, AudioEffectDefinition>> = Object.fromEntries(
  [
    effect(
      "voice-enhance",
      "Voice Enhance",
      "Voice",
      "Rumble cut, mud cut, presence lift and gentle compression.",
      [float("amount", "Amount", 0.7, 0, 1)],
    ),
    effect("eq", "Equalizer", "Fix", "Three-band EQ with a low cut.", [
      float("lowCut", "Low cut (Hz)", 20, 20, 500, 1),
      float("low", "Low (dB)", 0, -18, 18, 0.5),
      float("mid", "Mid (dB)", 0, -18, 18, 0.5),
      float("midFrequency", "Mid frequency (Hz)", 1000, 200, 5000, 10),
      float("high", "High (dB)", 0, -18, 18, 0.5),
    ]),
    effect("compressor", "Compressor", "Fix", "Evens out loud and quiet parts.", [
      float("threshold", "Threshold (dB)", -24, -60, 0, 1),
      float("ratio", "Ratio", 4, 1, 20, 0.5),
      float("attack", "Attack (s)", 0.01, 0.001, 0.5, 0.001),
      float("release", "Release (s)", 0.2, 0.01, 1, 0.01),
      float("makeup", "Make-up gain (dB)", 4, 0, 24, 0.5),
    ]),
    effect("reverb", "Reverb", "Space", "Room ambience from a generated impulse response.", [
      float("mix", "Mix", 0.25, 0, 1),
      float("decay", "Decay (s)", 2, 0.2, 8, 0.1),
      float("preDelay", "Pre-delay (s)", 0.02, 0, 0.3, 0.005),
      float("tone", "Tone (Hz)", 6000, 1000, 16000, 100),
    ]),
    effect("echo", "Echo", "Space", "Feedback delay.", [
      float("time", "Time (s)", 0.3, 0.05, 1.5, 0.01),
      float("feedback", "Feedback", 0.35, 0, 0.9),
      float("mix", "Mix", 0.3, 0, 1),
    ]),
    effect("bass-boost", "Bass Boost", "Character", "Low-shelf lift for weight and impact.", [
      float("amount", "Amount (dB)", 8, 0, 18, 0.5),
      float("frequency", "Frequency (Hz)", 100, 40, 250, 1),
    ]),
    effect("telephone", "Telephone", "Character", "300–3400 Hz band with a little crunch.", [
      float("amount", "Amount", 1, 0, 1),
      float("crunch", "Crunch", 0.3, 0, 1),
    ]),
    effect("megaphone", "Megaphone", "Character", "Narrow, driven midrange.", [
      float("amount", "Amount", 1, 0, 1),
      float("drive", "Drive", 0.6, 0, 1),
    ]),
    effect("muffled", "Muffled", "Character", "Behind a wall, underwater, next room.", [
      float("cutoff", "Cutoff (Hz)", 600, 150, 4000, 10),
      float("amount", "Amount", 1, 0, 1),
    ]),
    effect("pitch", "Pitch Shift", "Voice", "Chipmunk or deep voice without changing speed.", [
      float("semitones", "Semitones", 5, -12, 12, 1),
      float("mix", "Mix", 1, 0, 1),
    ]),
    effect("robot", "Robot", "Voice", "Ring-modulated metallic voice.", [
      float("frequency", "Frequency (Hz)", 50, 20, 400, 1),
      float("mix", "Mix", 0.8, 0, 1),
    ]),
    effect("distortion", "Distortion", "Character", "Soft-clipping overdrive.", [
      float("drive", "Drive", 0.4, 0, 1),
      float("tone", "Tone (Hz)", 4000, 500, 12000, 50),
      float("mix", "Mix", 0.6, 0, 1),
    ]),
    effect("tremolo", "Tremolo", "Character", "Rhythmic volume wobble.", [
      float("rate", "Rate (Hz)", 6, 0.5, 20, 0.1),
      float("depth", "Depth", 0.5, 0, 1),
    ]),
    effect("filter", "Filter", "Fix", "Low-pass, high-pass or band-pass sweep.", [
      {
        key: "mode",
        label: "Mode (0 low, 1 high, 2 band)",
        type: "int",
        default: 0,
        min: 0,
        max: 2,
        step: 1,
      },
      float("frequency", "Frequency (Hz)", 1200, 40, 16000, 10),
      float("resonance", "Resonance", 1, 0.1, 20, 0.1),
    ]),
    effect("pan", "Pan", "Mix", "Left/right placement.", [float("pan", "Pan", 0, -1, 1)]),
    effect("gain", "Gain", "Mix", "Volume in decibels.", [
      float("gain", "Gain (dB)", 0, -24, 24, 0.5),
    ]),
  ].map((d) => [d.id, d]),
);

const carriesSound = (project: Project, clipId: Id) => {
  const clip = findClip(project, clipId);
  return clip.type === "media" && project.assets[clip.assetId]?.hasAudio === true;
};

function mapStack(
  project: Project,
  clipId: Id,
  fn: (stack: readonly EffectInstance[]) => EffectInstance[],
): Project {
  const clip = findClip(project, clipId);
  if (clip.type !== "media") throw new Error("Only media clips have audio effects");
  const next: MediaClip = { ...clip, audioEffects: fn(clip.audioEffects) };
  return { ...project, clips: { ...project.clips, [clipId]: next } };
}

const defaults = (def: AudioEffectDefinition): Params =>
  Object.fromEntries(def.params.map((p) => [p.key, p.default]));

/** Appends an audio effect to every given clip that carries sound on an unlocked track. */
export function addAudioEffect(
  project: Project,
  clipIds: readonly Id[],
  def: AudioEffectDefinition,
  newId: IdFactory,
): Project {
  const locked = new Set(project.tracks.filter((t) => t.locked).map((t) => t.id));
  return clipIds
    .filter((id) => carriesSound(project, id) && !locked.has(findClip(project, id).trackId))
    .reduce(
      (acc, id) =>
        mapStack(acc, id, (stack) => [
          ...stack,
          { id: newId(), effectId: def.id, enabled: true, params: defaults(def) },
        ]),
      project,
    );
}

export const updateAudioEffect = (
  project: Project,
  clipId: Id,
  id: Id,
  patch: { enabled?: boolean; params?: Params },
): Project =>
  mapStack(project, clipId, (stack) =>
    stack.map((e) =>
      e.id === id
        ? { ...e, enabled: patch.enabled ?? e.enabled, params: { ...e.params, ...patch.params } }
        : e,
    ),
  );

export const removeAudioEffect = (project: Project, clipId: Id, id: Id): Project =>
  mapStack(project, clipId, (stack) => stack.filter((e) => e.id !== id));

export function moveAudioEffect(project: Project, clipId: Id, id: Id, index: number): Project {
  return mapStack(project, clipId, (stack) => {
    const moving = stack.find((e) => e.id === id);
    if (!moving) return [...stack];
    const rest = stack.filter((e) => e.id !== id);
    rest.splice(Math.max(0, Math.min(index, rest.length)), 0, moving);
    return rest;
  });
}

export const MAX_AUDIO_TAIL = 30;

export function audioTail(_effects: readonly EffectInstance[]): number {
  throw new Error("Not implemented");
}
