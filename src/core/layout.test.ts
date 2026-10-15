import { describe, expect, it } from "vite-plus/test";
import { containSize, timeToX, visibleTicks, xToTime } from "./layout";

describe("containSize", () => {
  it("letterboxes wide media in a tall frame", () => {
    expect(containSize(1920, 1080, 1080, 1920)).toEqual({ width: 1080, height: 607.5 });
  });

  it("pillarboxes tall media in a wide frame", () => {
    expect(containSize(1080, 1920, 1920, 1080)).toEqual({ width: 607.5, height: 1080 });
  });
});

describe("timeline coordinates", () => {
  it("round-trips between time and pixels", () => {
    expect(timeToX(2.5, 40)).toBe(100);
    expect(xToTime(100, 40)).toBe(2.5);
    expect(xToTime(-10, 40)).toBe(0);
  });
});

describe("visibleTicks", () => {
  it("picks a readable major step for the zoom level", () => {
    const close = visibleTicks({ pxPerSecond: 200, from: 0, to: 2 });
    const far = visibleTicks({ pxPerSecond: 4, from: 0, to: 300 });
    expect(close.major).toBeLessThan(far.major);
    expect(close.major * 200).toBeGreaterThanOrEqual(60);
    expect(far.major * 4).toBeGreaterThanOrEqual(60);
  });

  it("lists major ticks inside the range", () => {
    const { ticks, major } = visibleTicks({ pxPerSecond: 12, from: 0, to: 30 });
    const majors = ticks.filter((t) => t.major).map((t) => t.time);
    expect(majors[0]).toBe(0);
    expect(majors[1]).toBe(major);
    expect(majors.every((t) => t <= 30)).toBe(true);
  });
});
