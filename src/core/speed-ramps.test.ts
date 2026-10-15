import { describe, expect, it } from "vite-plus/test";
import { emptyProject, sequentialIds, videoClip, withClips } from "./fixtures.test-utils";
import { rampSpeedAt, SPEED_RAMPS } from "./speed-ramps";
import { sourceTimeAt, splitClip } from "./timeline";
import type { MediaClip } from "./types";

const ramped = (speedRamp: string, speed = 1): MediaClip =>
  ({ ...videoClip("c", 10, 4, 2), speed, speedRamp }) as MediaClip;

describe("speed ramps", () => {
  it("ships the CapCut-style presets", () => {
    expect(Object.keys(SPEED_RAMPS)).toEqual(
      expect.arrayContaining(["montage", "hero", "bullet", "flashIn", "flashOut", "velocity"]),
    );
  });

  it("keeps the clip's source span: same in- and out-point as without the ramp", () => {
    for (const id of Object.keys(SPEED_RAMPS)) {
      const clip = ramped(id, 1.5);
      expect(sourceTimeAt(clip, 10)).toBeCloseTo(2);
      expect(sourceTimeAt(clip, 14)).toBeCloseTo(2 + 4 * 1.5);
    }
  });

  it("is monotonic and follows the curve's pacing", () => {
    const clip = ramped("velocity");
    const samples = Array.from({ length: 41 }, (_, i) => sourceTimeAt(clip, 10 + i * 0.1));
    samples.slice(1).forEach((s, i) => expect(s).toBeGreaterThanOrEqual(samples[i]!));
    expect(sourceTimeAt(clip, 12) - 2).toBeLessThan(2);
  });

  it("reports the instantaneous speed, averaging to the clip speed", () => {
    const clip = ramped("montage", 2);
    const n = 400;
    const mean =
      Array.from({ length: n }, (_, i) => rampSpeedAt(clip, 10 + ((i + 0.5) / n) * 4)).reduce(
        (a, b) => a + b,
      ) / n;
    expect(mean).toBeCloseTo(2, 1);
    expect(rampSpeedAt({ ...clip, speedRamp: null }, 11)).toBe(2);
  });

  it("bakes a ramp into constant-speed halves when split, keeping the cut seamless", () => {
    const base = withClips(emptyProject(), ramped("velocity"));
    const cutAt = 11;
    const sourceAtCut = sourceTimeAt(base.clips.c as MediaClip, cutAt);
    const project = splitClip(base, "c", cutAt, sequentialIds("s"));
    const left = project.clips.c as MediaClip;
    const right = project.clips["s-1"] as MediaClip;
    expect(left.speedRamp).toBeNull();
    expect(right.speedRamp).toBeNull();
    expect(right.offset).toBeCloseTo(sourceAtCut);
    expect(left.offset + left.speed * left.duration).toBeCloseTo(sourceAtCut);
    expect(right.offset + right.speed * right.duration).toBeCloseTo(6);
  });
});
