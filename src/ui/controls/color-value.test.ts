import { describe, expect, it } from "vite-plus/test";
import { colorValue, pickerColor } from "./color-value";

describe("picker color values", () => {
  it("preserves a translucent shadow when changing its RGB channels", () => {
    const edited = pickerColor("rgba(0, 0, 0, 0.35)").withChannelValue("red", 255);
    expect(colorValue(edited, true)).toBe("rgba(255, 0, 0, 0.35)");
  });

  it("keeps shader and background colors as six-digit opaque hex", () => {
    expect(colorValue(pickerColor("rgba(255, 128, 0, 0.35)"), false)).toBe("#ff8000");
    expect(colorValue(pickerColor("#abc"), false)).toBe("#aabbcc");
  });

  it("round-trips full transparency without turning the color opaque", () => {
    const value = colorValue(pickerColor("#aabbcc").withChannelValue("alpha", 0), true);
    expect(pickerColor(value).getChannelValue("alpha")).toBe(0);
    expect(pickerColor(value).toString("hex")).toBe("#AABBCC");
  });

  it("recovers malformed saved colors with a usable fallback", () => {
    expect(colorValue(pickerColor("invalid"), false)).toBe("#000000");
  });
});
