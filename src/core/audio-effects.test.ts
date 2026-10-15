import { describe, expect, it } from "vite-plus/test";
import {
  addAudioEffect,
  AUDIO_EFFECTS,
  moveAudioEffect,
  removeAudioEffect,
  updateAudioEffect,
} from "./audio-effects";
import { createMediaClip } from "./factories";
import {
  audioAsset,
  emptyProject,
  imageAsset,
  sequentialIds,
  textClip,
  videoClip,
  withClips,
} from "./fixtures.test-utils";
import type { MediaClip } from "./types";

const reverb = AUDIO_EFFECTS.reverb!;
const eq = AUDIO_EFFECTS.eq!;

describe("audio effect catalog", () => {
  it("covers the voice and creative essentials", () => {
    for (const id of [
      "eq",
      "compressor",
      "reverb",
      "echo",
      "bass-boost",
      "telephone",
      "muffled",
      "pitch",
      "robot",
      "distortion",
      "pan",
      "gain",
      "voice-enhance",
      "megaphone",
    ]) {
      expect(AUDIO_EFFECTS[id], id).toBeDefined();
    }
  });

  it("has sane parameter ranges", () => {
    for (const def of Object.values(AUDIO_EFFECTS)) {
      for (const p of def.params) {
        if (typeof p.default === "number") {
          expect(p.default, `${def.id}.${p.key}`).toBeGreaterThanOrEqual(p.min ?? -Infinity);
          expect(p.default, `${def.id}.${p.key}`).toBeLessThanOrEqual(p.max ?? Infinity);
        }
      }
    }
  });
});

describe("audio effect stacks", () => {
  const still = { ...createMediaClip(imageAsset, { id: "img", trackId: "V1", start: 20 }) };
  const music = { ...createMediaClip(audioAsset, { id: "m", trackId: "A1", start: 0 }) };
  const base = () =>
    withClips(emptyProject(), videoClip("v", 0, 4), music, still, textClip("t", 0, 1));

  it("adds effects only to clips that carry sound", () => {
    const project = addAudioEffect(base(), ["v", "m", "img", "t"], reverb, sequentialIds("a"));
    expect((project.clips.v as MediaClip).audioEffects.map((e) => e.effectId)).toEqual(["reverb"]);
    expect((project.clips.m as MediaClip).audioEffects.map((e) => e.effectId)).toEqual(["reverb"]);
    expect((project.clips.img as MediaClip).audioEffects).toEqual([]);
  });

  it("updates, reorders and removes entries", () => {
    const next = sequentialIds("a");
    let project = addAudioEffect(base(), ["m"], reverb, next);
    project = addAudioEffect(project, ["m"], eq, next);
    const [first, second] = (project.clips.m as MediaClip).audioEffects;
    project = updateAudioEffect(project, "m", first!.id, { params: { mix: 0.9 }, enabled: false });
    expect((project.clips.m as MediaClip).audioEffects[0]).toMatchObject({
      enabled: false,
      params: { mix: 0.9 },
    });
    project = moveAudioEffect(project, "m", second!.id, 0);
    expect((project.clips.m as MediaClip).audioEffects.map((e) => e.effectId)).toEqual([
      "eq",
      "reverb",
    ]);
    project = removeAudioEffect(project, "m", second!.id);
    expect((project.clips.m as MediaClip).audioEffects.map((e) => e.effectId)).toEqual(["reverb"]);
  });
});
