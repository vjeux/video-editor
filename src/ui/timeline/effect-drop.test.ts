import { describe, expect, it } from "vite-plus/test";
import { createMediaClip } from "../../core/factories";
import { audioAsset, emptyProject, videoClip, withClips } from "../../core/fixtures.test-utils";
import type { Project, Track } from "../../core/types";
import { effectKindMime } from "../effect-dnd";
import { cutTarget, effectDragKind, effectTargets } from "./effect-drop";

// V1: a [0, 4) | b [4, 8)   gap   c [10, 12)
const project: Project = withClips(
  emptyProject(),
  videoClip("a", 0, 4),
  videoClip("b", 4, 4),
  videoClip("c", 10, 2),
  { ...createMediaClip(audioAsset, { id: "music", trackId: "A1", start: 0 }), duration: 5 },
);
const track = (id: string): Track => project.tracks.find((t) => t.id === id) as Track;
const locked = (id: string): Track => ({ ...track(id), locked: true });

describe("effectDragKind", () => {
  it("reads the kind from the drag types", () => {
    expect(effectDragKind(["text/plain", effectKindMime("effect")])).toBe("effect");
    expect(effectDragKind([effectKindMime("transition")])).toBe("transition");
    expect(effectDragKind(["Files"])).toBeNull();
  });
});

describe("effectTargets", () => {
  it("targets the hovered clip", () => {
    expect(effectTargets(project, track("V1"), 5, [])).toEqual(["b"]);
  });

  it("targets the whole selection when hovering one of several selected clips", () => {
    expect(effectTargets(project, track("V1"), 5, ["a", "b"])).toEqual(["a", "b"]);
    expect(effectTargets(project, track("V1"), 11, ["a", "b"])).toEqual(["c"]);
  });

  it("has no target in gaps, on audio clips or on locked tracks", () => {
    expect(effectTargets(project, track("V1"), 9, [])).toEqual([]);
    expect(effectTargets(project, track("A1"), 1, [])).toEqual([]);
    expect(effectTargets(project, locked("V1"), 5, [])).toEqual([]);
    expect(effectTargets(project, null, 5, [])).toEqual([]);
  });
});

describe("cutTarget", () => {
  const cut = { fromId: "a", toId: "b", time: 4 };

  it("picks the nearest cut within reach", () => {
    expect(cutTarget(project, track("V1"), 3.8, 0.5)).toEqual(cut);
    expect(cutTarget(project, track("V1"), 4.4, 0.5)).toEqual(cut);
  });

  it("falls back to the cut starting the hovered clip", () => {
    expect(cutTarget(project, track("V1"), 7, 0.5)).toEqual(cut);
  });

  it("has no target without an adjacent cut, on audio or locked tracks", () => {
    expect(cutTarget(project, track("V1"), 2, 0.5)).toBeNull();
    expect(cutTarget(project, track("V1"), 11, 0.5)).toBeNull();
    expect(cutTarget(project, track("A1"), 4, 0.5)).toBeNull();
    expect(cutTarget(project, locked("V1"), 4, 0.5)).toBeNull();
  });
});
