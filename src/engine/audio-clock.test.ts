import { describe, expect, it } from "vite-plus/test";
import { audibleContextTime } from "./audio-clock";

describe("audibleContextTime", () => {
  it("extrapolates the output timestamp to now", () => {
    expect(
      audibleContextTime({
        output: { contextTime: 10, performanceTime: 5000 },
        currentTime: 10.2,
        latency: 0.05,
        nowMs: 5016,
      }),
    ).toBeCloseTo(10.016, 9);
  });

  it("falls back to the current time minus output latency", () => {
    expect(
      audibleContextTime({ output: null, currentTime: 10.2, latency: 0.05, nowMs: 0 }),
    ).toBeCloseTo(10.15, 9);
  });

  it("ignores an output timestamp that has not started yet", () => {
    expect(
      audibleContextTime({
        output: { contextTime: 0, performanceTime: 0 },
        currentTime: 3,
        latency: 0.02,
        nowMs: 9000,
      }),
    ).toBeCloseTo(2.98, 9);
  });
});
