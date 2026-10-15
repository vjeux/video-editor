import { describe, expect, it } from "vite-plus/test";
import { formatDuration, formatFps, formatTimecode, frameStart, snapToFrame } from "./time";

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

  it("counts whole frames at fractional rates, labelled by the nominal rate", () => {
    const film = 24000 / 1001;
    expect(formatTimecode(23 / film, film)).toBe("00:00:00:23");
    expect(formatTimecode(24 / film, film)).toBe("00:00:01:00");
  });

  it("widens the frame field for rates of 100 fps and above", () => {
    expect(formatTimecode(5 / 120, 120)).toBe("00:00:00:005");
    expect(formatTimecode(119 / 120, 120)).toBe("00:00:00:119");
  });

  it("uses drop-frame timecode at 29.97 and 59.94, so it tracks the clock", () => {
    const ntsc = 30000 / 1001;
    expect(formatTimecode(1799 / ntsc, ntsc)).toBe("00:00:59;29");
    expect(formatTimecode(1800 / ntsc, ntsc)).toBe("00:01:00;02");
    expect(formatTimecode(17982 / ntsc, ntsc)).toBe("00:10:00;00");
    expect(formatTimecode(3600, 60000 / 1001)).toBe("01:00:00;00");
  });
});

describe("formatFps", () => {
  it("names standard rates the way editors do", () => {
    expect(formatFps(30)).toBe("30");
    expect(formatFps(30000 / 1001)).toBe("29.97");
    expect(formatFps(24000 / 1001)).toBe("23.976");
    expect(formatFps(60000 / 1001)).toBe("59.94");
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
