import { describe, expect, it } from "vite-plus/test";
import { createProject } from "./factories";
import { emptyProject, sequentialIds, videoClip, withClips } from "./fixtures.test-utils";
import { addTrack, overlayTrackFor, removeTrack, trackFor, trackLabel } from "./tracks";

describe("addTrack", () => {
  it("stacks titles on top, video above existing video, audio at the bottom", () => {
    const ids = sequentialIds("t");
    let project = emptyProject();
    project = addTrack(project, "video", ids()).project;
    project = addTrack(project, "audio", ids()).project;
    project = addTrack(project, "text", ids()).project;
    expect(project.tracks.map((t) => t.id)).toEqual(["t-3", "T1", "t-1", "V1", "A1", "t-2"]);
  });

  it("places the first video track above audio but below titles", () => {
    const base = { ...createProject({ name: "x" }) };
    const withAudio = addTrack(base, "audio", "a").project;
    const withText = addTrack(withAudio, "text", "t").project;
    const project = addTrack(withText, "video", "v").project;
    expect(project.tracks.map((t) => t.id)).toEqual(["t", "v", "a"]);
  });

  it("names tracks after their kind and count", () => {
    const project = addTrack(emptyProject(), "video", "v2").project;
    expect(project.tracks.find((t) => t.id === "v2")?.name).toBe("Video 2");
  });
});

describe("trackFor", () => {
  it("reuses the first unlocked compatible track", () => {
    const base = emptyProject();
    const { project, trackId } = trackFor(base, "image", () => "new");
    expect(trackId).toBe("V1");
    expect(project).toBe(base);
  });

  it("creates a track when none fits", () => {
    const base = emptyProject();
    const locked = { ...base, tracks: base.tracks.map((t) => ({ ...t, locked: t.id === "A1" })) };
    const { project, trackId } = trackFor(locked, "audio", () => "new");
    expect(trackId).toBe("new");
    expect(project.tracks.at(-1)?.id).toBe("new");
  });
});

describe("removeTrack", () => {
  it("removes the track and its clips", () => {
    const project = removeTrack(withClips(emptyProject(), videoClip("c", 0, 1)), "V1");
    expect(project.tracks.map((t) => t.id)).toEqual(["T1", "A1"]);
    expect(project.clips).toEqual({});
  });
});

describe("trackLabel", () => {
  it("numbers tracks of a kind from the bottom up", () => {
    const project = addTrack(emptyProject(), "video", "v2").project;
    expect(trackLabel(project, "v2")).toBe("V2");
    expect(trackLabel(project, "V1")).toBe("V1");
    expect(trackLabel(project, "A1")).toBe("A1");
  });
});

describe("overlayTrackFor", () => {
  it("creates a track above footage instead of carving into it", () => {
    const base = withClips(emptyProject(), videoClip("v", 0, 10));
    const { project, trackId } = overlayTrackFor(base, "adjustment", 2, 3, () => "fx-track");
    expect(trackId).toBe("fx-track");
    const order = project.tracks.map((t) => t.id);
    expect(order.indexOf("fx-track")).toBeLessThan(order.indexOf("V1"));
  });

  it("reuses a free track that sits above the footage", () => {
    const base = addTrack(withClips(emptyProject(), videoClip("v", 0, 10)), "video", "V2").project;
    expect(overlayTrackFor(base, "adjustment", 2, 3, () => "new").trackId).toBe("V2");
  });

  it("uses the first compatible track when nothing visual is underneath", () => {
    expect(overlayTrackFor(emptyProject(), "adjustment", 2, 3, () => "new").trackId).toBe("V1");
  });
});
