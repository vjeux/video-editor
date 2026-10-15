import { describe, expect, it } from "vite-plus/test";
import {
  addCustomEffect,
  addEffect,
  createEffectInstance,
  cutsOnTrack,
  moveEffect,
  removeCustomEffect,
  removeEffect,
  setTransition,
  updateEffect,
} from "./effects";
import {
  clipsOn,
  emptyProject,
  sequentialIds,
  textClip,
  videoClip,
  withClips,
} from "./fixtures.test-utils";
import { createAdjustmentClip } from "./factories";
import { layersAt } from "./layers";
import { migrateProject } from "./migrate";
import { placeClip, splitClip } from "./timeline";
import type { EffectDefinition, Project } from "./types";

const blur: EffectDefinition = {
  id: "blur",
  name: "Blur",
  kind: "effect",
  category: "Blur",
  description: "",
  author: "",
  source: "vec4 effect(vec2 uv) { return getColor(uv); }",
  params: [
    { key: "radius", label: "Radius", type: "float", default: 4, min: 0, max: 50 },
    { key: "tint", label: "Tint", type: "color", default: "#ffffff" },
  ],
  lut: null,
};

const crossfade: EffectDefinition = {
  ...blur,
  id: "crossfade",
  name: "Crossfade",
  kind: "transition",
  params: [{ key: "smoothness", label: "Smoothness", type: "float", default: 0.5 }],
};

const ids = () => sequentialIds("fx");

function twoClips(): Project {
  return withClips(
    emptyProject(),
    videoClip("a", 0, 4),
    videoClip("b", 4, 4),
    videoClip("far", 20, 2),
  );
}

describe("effect stacks", () => {
  it("creates an instance with the definition's defaults", () => {
    expect(createEffectInstance(blur, "e1")).toEqual({
      id: "e1",
      effectId: "blur",
      enabled: true,
      params: { radius: 4, tint: "#ffffff" },
    });
  });

  it("appends an effect to every given clip on unlocked tracks", () => {
    const project = addEffect(twoClips(), ["a", "b"], blur, ids());
    expect(project.clips.a?.effects.map((e) => e.effectId)).toEqual(["blur"]);
    expect(project.clips.b?.effects.map((e) => e.effectId)).toEqual(["blur"]);
  });

  it("skips clips on locked tracks", () => {
    const base = twoClips();
    const locked = { ...base, tracks: base.tracks.map((t) => ({ ...t, locked: t.id === "V1" })) };
    expect(addEffect(locked, ["a"], blur, ids()).clips.a?.effects).toEqual([]);
  });

  it("updates, reorders and removes stack entries", () => {
    let project = addEffect(twoClips(), ["a"], blur, ids());
    project = addEffect(project, ["a"], { ...blur, id: "glow" }, ids());
    const [first, second] = project.clips.a!.effects;
    project = updateEffect(project, "a", first!.id, { enabled: false, params: { radius: 12 } });
    expect(project.clips.a!.effects[0]).toMatchObject({
      enabled: false,
      params: { radius: 12, tint: "#ffffff" },
    });
    project = moveEffect(project, "a", second!.id, 0);
    expect(project.clips.a!.effects.map((e) => e.effectId)).toEqual(["glow", "blur"]);
    project = removeEffect(project, "a", second!.id);
    expect(project.clips.a!.effects.map((e) => e.effectId)).toEqual(["blur"]);
  });
});

describe("transitions", () => {
  it("lists the cuts between touching clips", () => {
    expect(cutsOnTrack(twoClips(), "V1")).toEqual([{ fromId: "a", toId: "b", time: 4 }]);
  });

  it("attaches a transition to the incoming clip of a cut", () => {
    const project = setTransition(twoClips(), "b", crossfade, 1);
    expect(project.clips.b?.transitionIn).toEqual({
      effectId: "crossfade",
      duration: 1,
      params: { smoothness: 0.5 },
    });
  });

  it("clamps the duration to the shorter neighbour", () => {
    const base = withClips(emptyProject(), videoClip("a", 0, 0.5), videoClip("b", 0.5, 4));
    expect(setTransition(base, "b", crossfade, 3).clips.b?.transitionIn?.duration).toBe(0.5);
  });

  it("refuses clips without an adjacent predecessor", () => {
    expect(() => setTransition(twoClips(), "far", crossfade, 1)).toThrow(/adjacent/);
  });

  it("removes a transition", () => {
    const project = setTransition(setTransition(twoClips(), "b", crossfade, 1), "b", null);
    expect(project.clips.b?.transitionIn).toBeNull();
  });

  it("does not let the right half of a split inherit the transition", () => {
    const project = splitClip(setTransition(twoClips(), "b", crossfade, 1), "b", 6, ids());
    expect(project.clips.b?.transitionIn).not.toBeNull();
    expect(project.clips["fx-1"]?.transitionIn).toBeNull();
  });
});

describe("layersAt", () => {
  it("returns plain clip layers bottom to top", () => {
    const project = withClips(twoClips(), textClip("t", 0, 2));
    expect(layersAt(project, 1).map((l) => (l.kind === "clip" ? l.clip.id : l.kind))).toEqual([
      "a",
      "t",
    ]);
  });

  it("replaces both clips with one transition layer inside the window", () => {
    const project = setTransition(twoClips(), "b", crossfade, 2);
    const at = (t: number) => layersAt(project, t);
    expect(at(2.9).map((l) => l.kind)).toEqual(["clip"]);
    const mid = at(4.5)[0];
    expect(mid).toMatchObject({ kind: "transition", from: { id: "a" }, to: { id: "b" } });
    expect(mid?.kind === "transition" && mid.progress).toBeCloseTo(0.75);
    expect(at(3)[0]).toMatchObject({ kind: "transition", progress: 0 });
    expect(at(5)).toEqual([{ kind: "clip", clip: project.clips.b }]);
  });

  it("ignores a transition whose clips no longer touch", () => {
    const base = setTransition(twoClips(), "b", crossfade, 2);
    const moved = { ...base, clips: { ...base.clips, b: { ...base.clips.b!, start: 4.5 } } };
    expect(layersAt(moved, 4.6).map((l) => l.kind)).toEqual(["clip"]);
  });

  it("emits adjustment clips as layers in stack order", () => {
    const project = placeClip(
      twoClips(),
      { ...createAdjustmentClip({ id: "adj", trackId: "V1", start: 10 }) },
      ids(),
    );
    expect(clipsOn(project, "V1").map((c) => c.id)).toContain("adj");
    expect(layersAt(project, 11)).toEqual([{ kind: "clip", clip: project.clips.adj }]);
  });
});

describe("custom effects", () => {
  it("adds definitions to the project and strips their uses on removal", () => {
    let project = addCustomEffect(twoClips(), { ...blur, id: "mine" });
    project = addEffect(project, ["a"], { ...blur, id: "mine" }, ids());
    project = setTransition(
      addCustomEffect(project, { ...crossfade, id: "mine-t" }),
      "b",
      { ...crossfade, id: "mine-t" },
      1,
    );
    expect(Object.keys(project.customEffects)).toEqual(["mine", "mine-t"]);
    project = removeCustomEffect(removeCustomEffect(project, "mine"), "mine-t");
    expect(project.customEffects).toEqual({});
    expect(project.clips.a?.effects).toEqual([]);
    expect(project.clips.b?.transitionIn).toBeNull();
  });
});

describe("migrateProject", () => {
  it("upgrades version 1 projects with empty effect data", () => {
    const current = twoClips();
    const v1 = JSON.parse(JSON.stringify({ ...current, version: 1 })) as Record<string, unknown>;
    delete v1.customEffects;
    for (const clip of Object.values(v1.clips as Record<string, Record<string, unknown>>)) {
      delete clip.effects;
      delete clip.transitionIn;
    }
    expect(migrateProject(v1)).toEqual(current);
  });

  it("rejects unknown data", () => {
    expect(() => migrateProject({ version: 99 })).toThrow(/version/);
  });
});
