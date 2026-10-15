import { describe, expect, it } from "vite-plus/test";
import { FRAME_RATES, suggestProjectFps } from "./frame-rates";

describe("FRAME_RATES", () => {
  it("offers the broadcast, film and high frame rates", () => {
    expect(FRAME_RATES.map((r) => r.label)).toEqual([
      "23.976",
      "24",
      "25",
      "29.97",
      "30",
      "50",
      "59.94",
      "60",
      "120",
    ]);
  });
});

describe("suggestProjectFps", () => {
  it("matches a measured source rate to the listed rate it is", () => {
    expect(suggestProjectFps(29.97003)).toBe(30000 / 1001);
    expect(suggestProjectFps(30)).toBe(30);
    expect(suggestProjectFps(59.9401)).toBe(60000 / 1001);
    expect(suggestProjectFps(119.88)).toBe(120);
  });

  it("suggests nothing for unknown or unlisted rates", () => {
    expect(suggestProjectFps(null)).toBeNull();
    expect(suggestProjectFps(240)).toBeNull();
    expect(suggestProjectFps(15)).toBeNull();
  });
});
