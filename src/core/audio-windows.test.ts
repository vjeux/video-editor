import { describe, expect, it } from "vite-plus/test";
import { clipSpan, mixPreRoll, mixWindows, overlap, peakBucket, PeakStream } from "./audio-windows";
import { createMediaClip } from "./factories";
import { audioAsset, emptyProject, withClips } from "./fixtures.test-utils";
import type { MediaClip } from "./types";

describe("mixWindows", () => {
  it("tiles the whole mix in fixed windows with a short last one", () => {
    const windows = mixWindows(25, 10, 0);
    expect(windows.map((w) => [w.start, w.end])).toEqual([
      [0, 10],
      [10, 20],
      [20, 25],
    ]);
    expect(windows.every((w) => w.renderStart === w.start)).toBe(true);
  });

  it("renders each window from earlier so effect tails carry over, never before zero", () => {
    expect(mixWindows(25, 10, 4).map((w) => w.renderStart)).toEqual([0, 6, 16]);
  });

  it("has no windows for an empty mix and one for a mix shorter than a window", () => {
    expect(mixWindows(0, 10, 4)).toEqual([]);
    expect(mixWindows(3, 10, 4)).toEqual([{ start: 0, end: 3, renderStart: 0 }]);
  });

  it("covers a long mix contiguously in whole samples", () => {
    const total = 48_000 * 3600 + 17;
    const windows = mixWindows(total, 480_000, 96_000);
    expect(windows[0]!.start).toBe(0);
    expect(windows.at(-1)!.end).toBe(total);
    windows.slice(1).forEach((w, i) => expect(w.start).toBe(windows[i]!.end));
  });
});

describe("overlap", () => {
  const target = { start: 100, end: 200 };

  it("maps the shared samples of a chunk into the target", () => {
    expect(overlap(target, 150, 20)).toEqual({ from: 0, to: 20, at: 50 });
  });

  it("clips a chunk that starts before or ends after the target", () => {
    expect(overlap(target, 90, 20)).toEqual({ from: 10, to: 20, at: 0 });
    expect(overlap(target, 190, 20)).toEqual({ from: 0, to: 10, at: 90 });
    expect(overlap(target, 50, 500)).toEqual({ from: 50, to: 150, at: 0 });
  });

  it("is null when nothing is shared", () => {
    expect(overlap(target, 0, 100)).toBeNull();
    expect(overlap(target, 200, 10)).toBeNull();
  });
});

describe("clipSpan", () => {
  const clip = {
    ...createMediaClip(audioAsset, { id: "a", trackId: "t", start: 10 }),
    duration: 20,
    offset: 5,
    speed: 2,
  } as MediaClip;

  it("is the part of the window the clip plays, with the source it reads", () => {
    expect(clipSpan(clip, 0, 15)).toEqual({ from: 10, to: 15, sourceFrom: 5, sourceTo: 15 });
    expect(clipSpan(clip, 25, 40)).toEqual({ from: 25, to: 30, sourceFrom: 35, sourceTo: 45 });
  });

  it("is null for a window the clip does not reach", () => {
    expect(clipSpan(clip, 0, 10)).toBeNull();
    expect(clipSpan(clip, 30, 40)).toBeNull();
  });
});

describe("mixPreRoll", () => {
  const withEffects = (effects: MediaClip["audioEffects"]) =>
    withClips(emptyProject(), {
      ...createMediaClip(audioAsset, { id: "a", trackId: "A1", start: 0 }),
      audioEffects: effects,
    });

  it("is zero for dry clips, whose windows join exactly", () => {
    expect(mixPreRoll(withEffects([]))).toBe(0);
  });

  it("is the longest tail of any audible effect", () => {
    const reverb = {
      id: "r",
      effectId: "reverb",
      enabled: true,
      params: { decay: 3, preDelay: 0.1 },
    };
    expect(mixPreRoll(withEffects([reverb]))).toBeCloseTo(3.1);
    expect(mixPreRoll(withEffects([{ ...reverb, enabled: false }]))).toBe(0);
  });
});

describe("PeakStream", () => {
  const whole = (channels: Float32Array[], bucket: number) => {
    const stream = new PeakStream(bucket);
    stream.add(channels, 0);
    return stream.peaks();
  };

  it("keeps the loudest absolute sample of each bucket across channels", () => {
    const left = Float32Array.from([0.1, -0.5, 0.2, 0.3, 0, 0]);
    const right = Float32Array.from([0.2, 0, 0, -0.9, 0, 0.05]);
    expect([...whole([left, right], 2)].map((v) => Math.round(v * 100))).toEqual([50, 90, 5]);
  });

  it("gives the same peaks fed chunk by chunk, wherever the chunks split", () => {
    const signal = Float32Array.from(
      { length: 1000 },
      (_, i) => Math.sin(i * 0.37) * (i % 7) * 0.1,
    );
    const stream = new PeakStream(30);
    for (let at = 0; at < signal.length; at += 47) {
      stream.add([signal.subarray(at, at + 47)], at);
    }
    expect(stream.peaks()).toEqual(whole([signal], 30));
  });

  it("places chunks by their start sample, leaving gaps silent", () => {
    const stream = new PeakStream(10);
    stream.add([Float32Array.from([0.5])], 25);
    expect([...stream.peaks()]).toEqual([0, 0, 0.5]);
  });

  it("sizes buckets from the sample rate", () => {
    expect(peakBucket(48_000, 100)).toBe(480);
    expect(peakBucket(50, 100)).toBe(1);
  });
});
