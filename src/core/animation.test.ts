import { describe, expect, it } from "vite-plus/test";
import { textClip, videoClip } from "./fixtures.test-utils";
import { clipOpacityAt, fadeEnvelope, gainAt, textAnimationState } from "./animation";
import type { Clip, MediaClip, TextAnimation, TextClip } from "./types";

const faded = (clip: Clip, fadeIn: number, fadeOut: number): Clip => ({ ...clip, fadeIn, fadeOut });

describe("fadeEnvelope", () => {
  const clip = faded(videoClip("c", 10, 10), 2, 4);

  it("ramps in, holds and ramps out", () => {
    expect(fadeEnvelope(clip, 10)).toBe(0);
    expect(fadeEnvelope(clip, 11)).toBe(0.5);
    expect(fadeEnvelope(clip, 14)).toBe(1);
    expect(fadeEnvelope(clip, 18)).toBe(0.5);
    expect(fadeEnvelope(clip, 20)).toBe(0);
  });

  it("is fully on without fades", () => {
    expect(fadeEnvelope(videoClip("c", 0, 5), 0)).toBe(1);
  });

  it("is zero outside the clip", () => {
    expect(fadeEnvelope(clip, 9)).toBe(0);
    expect(fadeEnvelope(clip, 21)).toBe(0);
  });
});

describe("clipOpacityAt", () => {
  it("multiplies the transform opacity by the fade", () => {
    const base = faded(videoClip("c", 0, 10), 2, 0);
    const clip = { ...base, transform: { ...base.transform, opacity: 0.5 } };
    expect(clipOpacityAt(clip, 1)).toBe(0.25);
  });
});

describe("gainAt", () => {
  it("combines clip volume with the fade envelope", () => {
    const clip = { ...faded(videoClip("c", 0, 10), 0, 2), volume: 0.8 } as MediaClip;
    expect(gainAt(clip, 5)).toBeCloseTo(0.8);
    expect(gainAt(clip, 9)).toBeCloseTo(0.4);
  });
});

describe("textAnimationState", () => {
  const animated = (animation: TextAnimation): TextClip => ({
    ...(textClip("t", 0, 4) as TextClip),
    animation,
  });

  it("is static with no animation", () => {
    expect(textAnimationState(animated("none"), 0)).toEqual({
      opacity: 1,
      offsetY: 0,
      blur: 0,
      visibleChars: 5,
    });
  });

  it("fades from transparent", () => {
    expect(textAnimationState(animated("fade"), 0).opacity).toBe(0);
    expect(textAnimationState(animated("fade"), 3).opacity).toBe(1);
  });

  it("rises from below into place", () => {
    expect(textAnimationState(animated("rise"), 0).offsetY).toBeGreaterThan(0);
    expect(textAnimationState(animated("rise"), 3).offsetY).toBe(0);
  });

  it("types characters progressively", () => {
    const start = textAnimationState(animated("type"), 0).visibleChars;
    const mid = textAnimationState(animated("type"), 0.1).visibleChars;
    const end = textAnimationState(animated("type"), 3).visibleChars;
    expect(start).toBe(0);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(5);
    expect(end).toBe(5);
  });

  it("comes into focus from a blur", () => {
    expect(textAnimationState(animated("blur"), 0).blur).toBeGreaterThan(0);
    expect(textAnimationState(animated("blur"), 3).blur).toBe(0);
  });
});
