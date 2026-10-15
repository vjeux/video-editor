import { describe, expect, it } from "vite-plus/test";
import { fillOrigin, percentOf, scrubbed, snap, valueAt } from "./number-math";

describe("snap", () => {
  it("rounds to the nearest step counted from the minimum", () => {
    expect(snap(7.4, 5, 0)).toBe(5);
    expect(snap(7.6, 5, 0)).toBe(10);
    expect(snap(1.3, 1, 0.5)).toBe(1.5);
  });

  it("removes floating point noise", () => {
    expect(snap(0.30000000000000004, 0.1, 0)).toBe(0.3);
    expect(snap(0.7, 0.05, 0)).toBe(0.7);
  });
});

describe("valueAt", () => {
  const track = { left: 100, width: 200 };

  it("maps the pointer across the track onto the range", () => {
    expect(valueAt(200, track, 0, 10, 0.5)).toBe(5);
    expect(valueAt(150, track, -1, 1, 0.01)).toBe(-0.5);
  });

  it("clamps outside the track", () => {
    expect(valueAt(0, track, 0, 10, 1)).toBe(0);
    expect(valueAt(999, track, 0, 10, 1)).toBe(10);
  });
});

describe("fillOrigin and percentOf", () => {
  it("fills from zero when the range straddles it", () => {
    expect(fillOrigin(-18, 18)).toBe(0);
    expect(fillOrigin(-1, 1)).toBe(0);
  });

  it("fills from the minimum otherwise", () => {
    expect(fillOrigin(0, 1)).toBe(0);
    expect(fillOrigin(12, 400)).toBe(12);
    expect(fillOrigin(-60, -10)).toBe(-60);
  });

  it("gives clamped percentages", () => {
    expect(percentOf(5, 0, 10)).toBe(50);
    expect(percentOf(-5, 0, 10)).toBe(0);
    expect(percentOf(3, 3, 3)).toBe(0);
  });
});

describe("scrubbed", () => {
  const range = { min: 0, max: 100 };

  it("moves one step per few pixels of drag", () => {
    expect(scrubbed(10, 8, 1, {}, range)).toBe(14);
    expect(scrubbed(10, -8, 1, {}, range)).toBe(6);
  });

  it("goes ten times coarser with shift and ten times finer with alt", () => {
    expect(scrubbed(10, 4, 1, { coarse: true }, range)).toBe(30);
    expect(scrubbed(10, 4, 1, { fine: true }, range)).toBe(10.2);
  });

  it("stays inside the range", () => {
    expect(scrubbed(98, 40, 1, {}, range)).toBe(100);
    expect(scrubbed(2, -40, 1, {}, range)).toBe(0);
  });
});
