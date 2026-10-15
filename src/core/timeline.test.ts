import { describe, expect, it } from "vite-plus/test";
import { createMediaClip, createTrack } from "./factories";
import {
  audioAsset,
  clipsOn,
  emptyProject,
  imageAsset,
  sequentialIds,
  textClip,
  videoAsset,
  videoClip,
  withClips,
} from "./fixtures.test-utils";
import {
  audibleClips,
  canPlace,
  maxClipDuration,
  moveClip,
  placeClip,
  projectDuration,
  removeAsset,
  removeClips,
  snapCandidates,
  snapTime,
  sourceTimeAt,
  splitAtTime,
  splitClip,
  trackEnd,
  trimClip,
  visualLayers,
} from "./timeline";
import type { MediaClip, Project } from "./types";

const ids = () => sequentialIds("new");

function mediaClip(project: Project, id: string): MediaClip {
  const clip = project.clips[id];
  if (clip?.type !== "media") throw new Error(`no media clip ${id}`);
  return clip;
}

describe("placeClip", () => {
  it("adds a clip to an empty track", () => {
    const project = placeClip(emptyProject(), videoClip("c1", 2, 5), ids());
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 2, duration: 5 }]);
  });

  it("rejects a clip on a track that does not accept its kind", () => {
    const clip = { ...videoClip("c1", 0, 5), trackId: "A1" };
    expect(() => placeClip(emptyProject(), clip, ids())).toThrow(/does not accept/);
  });

  it("rejects placement on a locked track", () => {
    const base = emptyProject();
    const project = {
      ...base,
      tracks: base.tracks.map((t) => (t.id === "V1" ? { ...t, locked: true } : t)),
    };
    expect(() => placeClip(project, videoClip("c1", 0, 5), ids())).toThrow(/locked/);
  });

  it("overwrites a clip it fully covers", () => {
    const base = withClips(emptyProject(), videoClip("old", 3, 2));
    const project = placeClip(base, videoClip("c1", 2, 5), ids());
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 2, duration: 5 }]);
  });

  it("trims the tail of a clip it overlaps from the right", () => {
    const base = withClips(emptyProject(), videoClip("old", 0, 4));
    const project = placeClip(base, videoClip("c1", 3, 5), ids());
    expect(clipsOn(project, "V1")).toEqual([
      { id: "old", start: 0, duration: 3 },
      { id: "c1", start: 3, duration: 5 },
    ]);
  });

  it("trims the head of a clip it overlaps from the left and advances its in-point", () => {
    const base = withClips(emptyProject(), { ...videoClip("old", 4, 6, 1), speed: 2 } as MediaClip);
    const project = placeClip(base, videoClip("c1", 0, 5), ids());
    expect(clipsOn(project, "V1")).toEqual([
      { id: "c1", start: 0, duration: 5 },
      { id: "old", start: 5, duration: 5 },
    ]);
    expect(mediaClip(project, "old").offset).toBe(3);
  });

  it("splits a clip it lands inside of", () => {
    const base = withClips(emptyProject(), videoClip("old", 0, 10));
    const project = placeClip(base, videoClip("c1", 4, 2), ids());
    expect(clipsOn(project, "V1")).toEqual([
      { id: "old", start: 0, duration: 4 },
      { id: "c1", start: 4, duration: 2 },
      { id: "new-1", start: 6, duration: 4 },
    ]);
    expect(mediaClip(project, "new-1").offset).toBe(6);
  });

  it("leaves clips on other tracks untouched", () => {
    const music = {
      ...createMediaClip(audioAsset, { id: "m", trackId: "A1", start: 0 }),
      duration: 10,
    };
    const base = withClips(emptyProject(), music);
    const project = placeClip(base, videoClip("c1", 0, 5), ids());
    expect(clipsOn(project, "A1")).toEqual([{ id: "m", start: 0, duration: 10 }]);
  });
});

describe("canPlace", () => {
  it("routes kinds to matching tracks only", () => {
    const project = emptyProject();
    expect(canPlace(project, "video", "V1")).toBe(true);
    expect(canPlace(project, "image", "V1")).toBe(true);
    expect(canPlace(project, "audio", "V1")).toBe(false);
    expect(canPlace(project, "text", "T1")).toBe(true);
    expect(canPlace(project, "audio", "A1")).toBe(true);
  });
});

describe("moveClip", () => {
  it("moves a clip in time without overwriting itself", () => {
    const base = withClips(emptyProject(), videoClip("c1", 0, 5));
    const project = moveClip(base, "c1", { start: 2, trackId: "V1" }, ids());
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 2, duration: 5 }]);
  });

  it("moves a clip to another compatible track", () => {
    const base = withClips(
      {
        ...emptyProject(),
        tracks: [...emptyProject().tracks, createTrack("video", "V2", "B-roll")],
      },
      videoClip("c1", 0, 5),
    );
    const project = moveClip(base, "c1", { start: 1, trackId: "V2" }, ids());
    expect(clipsOn(project, "V1")).toEqual([]);
    expect(clipsOn(project, "V2")).toEqual([{ id: "c1", start: 1, duration: 5 }]);
  });

  it("clamps negative start times to zero", () => {
    const base = withClips(emptyProject(), videoClip("c1", 3, 5));
    const project = moveClip(base, "c1", { start: -2, trackId: "V1" }, ids());
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 0, duration: 5 }]);
  });
});

describe("trimClip", () => {
  it("extends the end up to the remaining source media", () => {
    const base = withClips(emptyProject(), videoClip("c1", 0, 5, 12));
    const project = trimClip(base, "c1", "end", 100);
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 0, duration: 8 }]);
  });

  it("moves the in-point when trimming the start", () => {
    const base = withClips(emptyProject(), videoClip("c1", 2, 6, 1));
    const project = trimClip(base, "c1", "start", 4);
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 4, duration: 4 }]);
    expect(mediaClip(project, "c1").offset).toBe(3);
  });

  it("cannot reveal media before the source start", () => {
    const base = withClips(emptyProject(), videoClip("c1", 5, 5, 1));
    const project = trimClip(base, "c1", "start", 0);
    expect(clipsOn(project, "V1")).toEqual([{ id: "c1", start: 4, duration: 6 }]);
    expect(mediaClip(project, "c1").offset).toBe(0);
  });

  it("stops at neighbouring clips", () => {
    const base = withClips(
      emptyProject(),
      videoClip("a", 0, 4),
      videoClip("b", 6, 4, 10),
      videoClip("c", 12, 2),
    );
    const left = trimClip(base, "b", "start", 1);
    expect(clipsOn(left, "V1")[1]).toEqual({ id: "b", start: 4, duration: 6 });
    const right = trimClip(base, "b", "end", 20);
    expect(clipsOn(right, "V1")[1]).toEqual({ id: "b", start: 6, duration: 6 });
  });

  it("keeps at least one frame", () => {
    const base = withClips(emptyProject(), videoClip("c1", 0, 5));
    const project = trimClip(base, "c1", "end", -3);
    expect(project.clips.c1?.duration).toBeCloseTo(1 / project.settings.fps);
  });

  it("lets stills and titles stretch without a source limit", () => {
    const still = {
      ...createMediaClip(imageAsset, { id: "img", trackId: "V1", start: 0 }),
      duration: 5,
    };
    const base = withClips(emptyProject(), still, textClip("t", 0, 3));
    expect(trimClip(base, "img", "end", 500).clips.img?.duration).toBe(500);
    expect(trimClip(base, "t", "end", 90).clips.t?.duration).toBe(90);
  });
});

describe("splitClip", () => {
  it("splits into two contiguous clips with continuous source time", () => {
    const base = withClips(emptyProject(), {
      ...videoClip("c1", 2, 8, 1),
      fadeIn: 1,
      fadeOut: 2,
    } as MediaClip);
    const project = splitClip(base, "c1", 5, ids());
    expect(clipsOn(project, "V1")).toEqual([
      { id: "c1", start: 2, duration: 3 },
      { id: "new-1", start: 5, duration: 5 },
    ]);
    const [left, right] = [mediaClip(project, "c1"), mediaClip(project, "new-1")];
    expect(right.offset).toBe(4);
    expect([left.fadeIn, left.fadeOut, right.fadeIn, right.fadeOut]).toEqual([1, 0, 0, 2]);
  });

  it("ignores split points on the clip edges", () => {
    const base = withClips(emptyProject(), videoClip("c1", 2, 8));
    expect(splitClip(base, "c1", 2, ids())).toBe(base);
    expect(splitClip(base, "c1", 10, ids())).toBe(base);
  });
});

describe("splitAtTime", () => {
  it("cuts every clip under the playhead on unlocked tracks", () => {
    const base = withClips(
      emptyProject(),
      videoClip("v", 0, 10),
      textClip("t", 2, 6),
      videoClip("later", 20, 2),
    );
    const project = splitAtTime(base, 4, ids());
    expect(clipsOn(project, "V1").map((c) => c.start)).toEqual([0, 4, 20]);
    expect(clipsOn(project, "T1").map((c) => c.start)).toEqual([2, 4]);
  });

  it("restricts the cut to the given clips", () => {
    const base = withClips(emptyProject(), videoClip("v", 0, 10), textClip("t", 2, 6));
    const project = splitAtTime(base, 4, ids(), ["t"]);
    expect(clipsOn(project, "V1")).toHaveLength(1);
    expect(clipsOn(project, "T1")).toHaveLength(2);
  });
});

describe("removeClips", () => {
  it("removes clips and leaves a gap", () => {
    const base = withClips(
      emptyProject(),
      videoClip("a", 0, 4),
      videoClip("b", 4, 4),
      videoClip("c", 8, 4),
    );
    const project = removeClips(base, ["b"]);
    expect(clipsOn(project, "V1")).toEqual([
      { id: "a", start: 0, duration: 4 },
      { id: "c", start: 8, duration: 4 },
    ]);
  });

  it("ripples later clips on the same track to close the gap", () => {
    const base = withClips(
      emptyProject(),
      videoClip("a", 0, 4),
      videoClip("b", 4, 4),
      videoClip("c", 8, 4),
      videoClip("d", 14, 1),
      textClip("t", 9, 1),
    );
    const project = removeClips(base, ["a", "c"], { ripple: true });
    expect(clipsOn(project, "V1")).toEqual([
      { id: "b", start: 0, duration: 4 },
      { id: "d", start: 6, duration: 1 },
    ]);
    expect(clipsOn(project, "T1")).toEqual([{ id: "t", start: 9, duration: 1 }]);
  });
});

describe("removeAsset", () => {
  it("drops the asset and every clip that uses it", () => {
    const base = withClips(emptyProject(), videoClip("a", 0, 4), textClip("t", 0, 2));
    const project = removeAsset(base, videoAsset.id);
    expect(project.assets[videoAsset.id]).toBeUndefined();
    expect(Object.keys(project.clips)).toEqual(["t"]);
  });
});

describe("queries", () => {
  it("computes the project duration from the last clip end", () => {
    expect(projectDuration(emptyProject())).toBe(0);
    expect(
      projectDuration(withClips(emptyProject(), videoClip("a", 3, 4), textClip("t", 1, 9))),
    ).toBe(10);
  });

  it("computes the end of a track", () => {
    const project = withClips(emptyProject(), videoClip("a", 3, 4), textClip("t", 1, 9));
    expect(trackEnd(project, "V1")).toBe(7);
    expect(trackEnd(project, "A1")).toBe(0);
  });

  it("limits media clips by their remaining source and speed", () => {
    const clip = { ...videoClip("a", 0, 1, 4), speed: 2 } as MediaClip;
    expect(maxClipDuration(emptyProject(), clip)).toBe(8);
    expect(maxClipDuration(emptyProject(), textClip("t", 0, 1))).toBe(Infinity);
  });

  it("lists visible visual layers bottom to top at a time", () => {
    const base = withClips(emptyProject(), videoClip("v", 0, 10), textClip("t", 2, 3));
    expect(visualLayers(base, 3).map((c) => c.id)).toEqual(["v", "t"]);
    expect(visualLayers(base, 5).map((c) => c.id)).toEqual(["v"]);
    const hidden = {
      ...base,
      tracks: base.tracks.map((t) => (t.id === "V1" ? { ...t, hidden: true } : t)),
    };
    expect(visualLayers(hidden, 3).map((c) => c.id)).toEqual(["t"]);
  });

  it("lists audible clips honouring mute and solo", () => {
    const music = {
      ...createMediaClip(audioAsset, { id: "m", trackId: "A1", start: 0 }),
      duration: 10,
    };
    const base = withClips(emptyProject(), videoClip("v", 0, 10), music, textClip("t", 0, 1));
    expect(audibleClips(base).map((c) => c.id)).toEqual(["v", "m"]);

    const muted = {
      ...base,
      tracks: base.tracks.map((t) => (t.id === "V1" ? { ...t, muted: true } : t)),
    };
    expect(audibleClips(muted).map((c) => c.id)).toEqual(["m"]);

    const solo = {
      ...base,
      tracks: base.tracks.map((t) => (t.id === "V1" ? { ...t, solo: true } : t)),
    };
    expect(audibleClips(solo).map((c) => c.id)).toEqual(["v"]);
  });
});

describe("snapping", () => {
  it("snaps to the closest candidate within the threshold", () => {
    expect(snapTime(4.9, [0, 5, 10], 0.2)).toEqual({ time: 5, snapped: true });
    expect(snapTime(4.5, [0, 5, 10], 0.2)).toEqual({ time: 4.5, snapped: false });
  });

  it("collects clip edges, markers and the playhead, excluding the dragged clips", () => {
    const base = {
      ...withClips(emptyProject(), videoClip("a", 0, 4), videoClip("b", 6, 2)),
      markers: [{ id: "m", time: 12, label: "" }],
    };
    expect(snapCandidates(base, { exclude: ["b"], playhead: 3 }).sort((x, y) => x - y)).toEqual([
      0, 3, 4, 12,
    ]);
  });
});

describe("sourceTimeAt", () => {
  it("maps timeline time into source time through offset and speed", () => {
    const clip = { ...videoClip("a", 10, 4, 3), speed: 2 } as MediaClip;
    expect(sourceTimeAt(clip, 10)).toBe(3);
    expect(sourceTimeAt(clip, 11.5)).toBe(6);
  });
});
