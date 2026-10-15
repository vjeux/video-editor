import { describe, expect, it } from "vite-plus/test";
import { stepEnabled } from "./roving";

describe("stepEnabled", () => {
  const enabled = [false, true, true, false, true];

  it("starts at the first enabled entry going down from nothing", () => {
    expect(stepEnabled(enabled, -1, 1)).toBe(1);
  });

  it("starts at the last enabled entry going up from nothing", () => {
    expect(stepEnabled(enabled, -1, -1)).toBe(4);
  });

  it("skips disabled entries", () => {
    expect(stepEnabled(enabled, 2, 1)).toBe(4);
    expect(stepEnabled(enabled, 4, -1)).toBe(2);
  });

  it("wraps around both ends", () => {
    expect(stepEnabled(enabled, 4, 1)).toBe(1);
    expect(stepEnabled(enabled, 1, -1)).toBe(4);
  });

  it("returns -1 when nothing can be reached", () => {
    expect(stepEnabled([false, false], -1, 1)).toBe(-1);
    expect(stepEnabled([], 0, 1)).toBe(-1);
  });
});
