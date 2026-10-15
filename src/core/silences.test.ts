import { describe, expect, it } from "vite-plus/test";
import { createMediaClip } from "./factories";
import {
  clipsOn,
  emptyProject,
  sequentialIds,
  textClip,
  videoAsset,
  videoClip,
  withClips,
} from "./fixtures.test-utils";
import {
  detectSilences,
  levelEnvelope,
  removeSpans,
  silencesInClip,
  spansLength,
  suggestThreshold,
  type SilenceOptions,
} from "./silences";
import type { MediaClip } from "./types";

describe("levelEnvelope", () => {
  const rate = 1000;
  const sine = Float32Array.from({ length: rate }, (_, i) =>
    Math.sin((2 * Math.PI * 50 * i) / rate),
  );

  it("measures RMS level per frame in dBFS", () => {
    const levels = levelEnvelope([sine], rate, 0.1);
    expect(levels).toHaveLength(10);
    expect(levels[0]).toBeCloseTo(-3.01, 1);
  });

  it("floors digital silence and mixes channels", () => {
    const quiet = new Float32Array(rate);
    expect(levelEnvelope([quiet], rate, 0.5)[0]).toBe(-100);
    expect(levelEnvelope([sine, quiet], rate, 0.1)[0]).toBeCloseTo(-9.03, 1);
  });
});

const OPTIONS: SilenceOptions = { threshold: -40, minSilence: 0.3, padding: 0.05 };

describe("detectSilences", () => {
  it("finds long enough quiet runs, keeping padding next to speech", () => {
    const levels = Float32Array.from([-20, -20, -60, -60, -60, -60, -60, -20, -60, -20]);
    expect(detectSilences(levels, 0.1, OPTIONS)).toEqual([{ start: 0.25, end: 0.65 }]);
  });

  it("cuts leading and trailing silence right up to the edges", () => {
    const levels = Float32Array.from([-60, -60, -60, -20, -20, -60, -60, -60, -60]);
    expect(detectSilences(levels, 0.1, OPTIONS)).toEqual([
      { start: 0, end: 0.25 },
      { start: 0.55, end: 0.9 },
    ]);
  });

  it("ignores runs that padding would leave too short to cut", () => {
    const levels = Float32Array.from([-20, -60, -60, -60, -20]);
    expect(detectSilences(levels, 0.1, { ...OPTIONS, padding: 0.14 })).toEqual([]);
  });
});

describe("silencesInClip", () => {
  const clip: MediaClip = {
    ...(createMediaClip(videoAsset, { id: "v", trackId: "V1", start: 10 }) as MediaClip),
    offset: 5,
    duration: 4,
  };

  it("maps source silences into the clip's window on the timeline", () => {
    expect(
      silencesInClip(clip, [
        { start: 1, end: 2 },
        { start: 3, end: 5.5 },
        { start: 6, end: 7 },
        { start: 8.5, end: 12 },
        { start: 15, end: 16 },
      ]),
    ).toEqual([
      { start: 10, end: 10.5 },
      { start: 11, end: 12 },
      { start: 13.5, end: 14 },
    ]);
  });
});

describe("removeSpans", () => {
  it("cuts each span out of the clip and closes the gaps on its track", () => {
    const project = withClips(
      emptyProject(),
      videoClip("v", 0, 10),
      videoClip("after", 10, 2),
      textClip("title", 5, 2),
    );
    const cut = removeSpans(
      project,
      "v",
      [
        { start: 2, end: 3 },
        { start: 6, end: 8 },
      ],
      sequentialIds("cut"),
    );
    expect(clipsOn(cut, "V1")).toEqual([
      { id: "v", start: 0, duration: 2 },
      { id: "cut-4", start: 2, duration: 3 },
      { id: "cut-2", start: 5, duration: 2 },
      { id: "after", start: 7, duration: 2 },
    ]);
    expect([cut.clips["cut-4"], cut.clips["cut-2"]].map((c) => (c as MediaClip).offset)).toEqual([
      3, 8,
    ]);
    expect(cut.clips.title).toEqual(project.clips.title);
  });

  it("sums how much a set of spans removes", () => {
    expect(
      spansLength([
        { start: 2, end: 3 },
        { start: 6, end: 8 },
      ]),
    ).toBe(3);
  });
});

describe("suggestThreshold", () => {
  it("sits between the noise floor and the speech level", () => {
    const levels = Float32Array.from({ length: 100 }, (_, i) => (i % 2 ? -20 : -70));
    expect(suggestThreshold(levels)).toBe(-55);
  });

  it("stays within a sensible range", () => {
    expect(suggestThreshold(new Float32Array(50).fill(-100))).toBe(-60);
    expect(suggestThreshold(new Float32Array(50).fill(-6))).toBe(-20);
  });
});
