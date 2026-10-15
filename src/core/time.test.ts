import { describe, expect, it } from "vite-plus/test";
import { formatDuration, formatTimecode, frameStart, snapToFrame } from "./time";

describe("formatTimecode", () => {
  it("renders hours, minutes, seconds and frames", () => {
    expect(formatTimecode(0, 30)).toBe("00:00:00:00");
    expect(formatTimecode(6 + 7 / 24, 24)).toBe("00:00:06:07");
    expect(formatTimecode(3661.5, 30)).toBe("01:01:01:15");
  });

  it("does not round up to a frame that does not exist", () => {
    expect(formatTimecode(0.9999, 30)).toBe("00:00:00:29");
  });

  it("is robust to floating point error just below a frame boundary", () => {
    expect(formatTimecode(0.1 + 0.2, 10)).toBe("00:00:00:03");
  });
});

describe("formatDuration", () => {
  it("uses m:ss under an hour and h:mm:ss above", () => {
    expect(formatDuration(14.2)).toBe("0:14");
    expect(formatDuration(160)).toBe("2:40");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("snapToFrame", () => {
  it("rounds to the nearest frame boundary", () => {
    expect(snapToFrame(1.01, 25)).toBe(1);
    expect(snapToFrame(1.03, 25)).toBe(1.04);
  });
});

describe("frameStart", () => {
  it("is the start of the frame on screen at t", () => {
    expect(frameStart(1.01, 25)).toBe(1);
    expect(frameStart(1.039, 25)).toBe(1);
    expect(frameStart(0.1 + 0.2, 10)).toBeCloseTo(0.3, 9);
    expect(frameStart(2.5, 30)).toBe(2.5);
  });
});
