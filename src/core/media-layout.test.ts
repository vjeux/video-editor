import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_MEDIA_APPEARANCE as defaults } from "./factories";
import { insideMediaMask, mediaFrameSize, mediaPlacement } from "./media-layout";

describe("media framing", () => {
  it("keeps source proportions by default and follows crop, explicit ratios and circle masks", () => {
    expect(mediaFrameSize(1920, 1080, 800, 600, defaults)).toEqual({ width: 800, height: 450 });
    const cropped = { ...defaults, crop: { ...defaults.crop, left: 0.25, right: 0.25 } };
    expect(mediaFrameSize(1920, 1080, 800, 600, cropped).width).toBeCloseTo((600 * 8) / 9);
    expect(mediaFrameSize(1920, 1080, 800, 600, { ...cropped, aspect: 1 })).toEqual({
      width: 600,
      height: 600,
    });
    expect(
      mediaFrameSize(1920, 1080, 800, 600, {
        ...defaults,
        aspect: 2,
        mask: { ...defaults.mask, shape: "circle" },
      }),
    ).toEqual({ width: 600, height: 600 });
  });
  it("fits a cropped source inside asymmetric padding without changing the outer frame", () => {
    const a = {
      ...defaults,
      crop: { top: 0.1, right: 0.25, bottom: 0.1, left: 0.25 },
      padding: { top: 20, right: 10, bottom: 40, left: 30, linked: false },
    };
    const { source, viewport, picture } = mediaPlacement(400, 200, 200, 200, a);
    expect(source).toEqual({ x: 100, y: 20, width: 200, height: 160 });
    expect(viewport).toEqual({ x: -70, y: -80, width: 160, height: 140 });
    expect(picture).toEqual({ x: -70, y: -74, width: 160, height: 128 });
  });
  it("cover fills the viewport and uses position to choose the visible source area", () => {
    const a = { ...defaults, fit: "cover" as const, position: { x: 1, y: 0.5 } };
    expect(mediaPlacement(400, 200, 200, 200, a).picture).toEqual({
      x: -300,
      y: -100,
      width: 400,
      height: 200,
    });
    expect(mediaPlacement(400, 200, 200, 200, { ...a, position: { x: 0, y: 0.5 } }).picture.x).toBe(
      -100,
    );
  });
  it("keeps oversized padding and subpixel frames finite and positive", () => {
    const a = {
      ...defaults,
      padding: { top: 900, right: 800, bottom: 700, left: 600, linked: false },
    };
    for (const width of [0.1, 200]) {
      const { viewport, picture } = mediaPlacement(100, 100, width, 200, a);
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
      expect(picture.width).toBeGreaterThan(0);
      expect(Number.isFinite(picture.x)).toBe(true);
    }
  });
});

describe("mask hit targets", () => {
  it.each(["circle", "ellipse", "diamond", "hexagon", "custom"] as const)(
    "ignores empty corners of %s masks",
    (shape) => {
      const a = { ...defaults, mask: { ...defaults.mask, shape } };
      expect(insideMediaMask(0, 0, 100, 100, a)).toBe(true);
      expect(insideMediaMask(-49, -49, 100, 100, a)).toBe(false);
      expect(insideMediaMask(60, 0, 100, 100, a)).toBe(false);
    },
  );
  it("honours rounded rectangle corners", () => {
    expect(insideMediaMask(-49, -49, 100, 100, defaults)).toBe(true);
    expect(insideMediaMask(-49, -49, 100, 100, { ...defaults, radius: 20 })).toBe(false);
    expect(insideMediaMask(-49, 0, 100, 100, { ...defaults, radius: 20 })).toBe(true);
  });
  it("follows edited polygon points, including concave cutouts", () => {
    const mask = {
      shape: "custom" as const,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    };
    expect(insideMediaMask(40, 0, 100, 100, { ...defaults, mask })).toBe(false);
    expect(insideMediaMask(-40, 0, 100, 100, { ...defaults, mask })).toBe(true);
  });
});
