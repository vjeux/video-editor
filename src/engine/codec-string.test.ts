import { describe, expect, it } from "vite-plus/test";
import { avcCodecString } from "./codec-string";

describe("avcCodecString", () => {
  it("picks the High profile level that covers frame size and macroblock rate", () => {
    expect(avcCodecString(1920, 1080, 30)).toBe("avc1.640028");
    expect(avcCodecString(1920, 1080, 60)).toBe("avc1.64002a");
    expect(avcCodecString(1920, 1080, 120)).toBe("avc1.640033");
    expect(avcCodecString(3840, 2160, 30)).toBe("avc1.640033");
    expect(avcCodecString(3840, 2160, 60)).toBe("avc1.640034");
    expect(avcCodecString(1280, 720, 30)).toBe("avc1.64001f");
  });

  it("handles NTSC rates and sizes that are not multiples of 16", () => {
    expect(avcCodecString(1920, 1080, 60000 / 1001)).toBe("avc1.64002a");
    expect(avcCodecString(1080, 1920, 30)).toBe("avc1.640028");
  });
});
