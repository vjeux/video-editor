import { describe, expect, it } from "vite-plus/test";
import { emptyProject, videoAsset, videoClip, withClips } from "./fixtures.test-utils";
import { adoptSourceFormat } from "./source-format";
import type { Asset } from "./types";

const phone: Asset = { ...videoAsset, width: 1080, height: 1920, frameRate: 59.9401 };

describe("adoptSourceFormat", () => {
  it("matches an empty timeline to its first video's size and frame rate", () => {
    const settings = adoptSourceFormat(emptyProject(), phone).settings;
    expect(settings).toMatchObject({ width: 1080, height: 1920, fps: 60000 / 1001 });
  });

  it("keeps the frame rate when the source's matches no listed rate", () => {
    const project = emptyProject();
    const odd = adoptSourceFormat(project, { ...phone, frameRate: 15 });
    expect(odd.settings.fps).toBe(project.settings.fps);
    expect(odd.settings.width).toBe(1080);
  });

  it("scales very large sources down to the largest canvas", () => {
    const huge = adoptSourceFormat(emptyProject(), { ...phone, width: 7680, height: 4320 });
    expect(huge.settings).toMatchObject({ width: 3840, height: 2160 });
  });

  it("leaves a timeline that already has clips, and audio, alone", () => {
    const busy = withClips(emptyProject(), videoClip("v", 0, 2));
    expect(adoptSourceFormat(busy, phone)).toBe(busy);
    const empty = emptyProject();
    expect(adoptSourceFormat(empty, { ...phone, kind: "audio", width: 0, height: 0 })).toBe(empty);
  });
});
