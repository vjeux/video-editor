import { describe, expect, it } from "vite-plus/test";
import { createTextClip } from "../core/factories";
import type { TextStyle } from "../core/types";
import type { Ctx2D } from "./compositor";
import { layoutText, textBounds } from "./text-renderer";

type Metrics = Pick<
  TextMetrics,
  | "width"
  | "actualBoundingBoxLeft"
  | "actualBoundingBoxRight"
  | "actualBoundingBoxAscent"
  | "actualBoundingBoxDescent"
>;

function context(overrides: Record<string, Partial<Metrics>> = {}): Ctx2D {
  return {
    save() {},
    restore() {},
    measureText(text: string): Metrics {
      return {
        width: text.length * 50,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 50,
        actualBoundingBoxAscent: text ? 35 : 0,
        actualBoundingBoxDescent: text ? 15 : 0,
        ...overrides[text],
      };
    },
  } as unknown as Ctx2D;
}

function title(text: string, style: Partial<TextStyle> = {}) {
  const clip = createTextClip({ id: "title", trackId: "text", start: 0, text });
  return { ...clip, style: { ...clip.style, fontSize: 100, shadow: null, ...style } };
}

describe("text selection bounds", () => {
  it.each([
    { actualBoundingBoxLeft: -10, actualBoundingBoxRight: 120 },
    { actualBoundingBoxLeft: 20, actualBoundingBoxRight: 90 },
  ])("encloses asymmetric glyph overhang plus the full outline: %o", (metrics) => {
    const ctx = context({ AV: metrics });
    const clip = title("AV", { stroke: { color: "red", width: 20 } });
    const before = layoutText(ctx, clip);
    expect(textBounds(ctx, clip).width).toBe(182);
    expect(layoutText(ctx, clip)).toEqual(before);
  });

  it("includes tall accents and descenders instead of assuming they fit the line height", () => {
    const ctx = context({ A: { actualBoundingBoxAscent: 80, actualBoundingBoxDescent: 85 } });
    const clip = title("A", { stroke: { color: "red", width: 20 } });
    expect(textBounds(ctx, clip).height).toBe(212);
  });

  it("measures separately painted words at their actual positions", () => {
    const ctx = context({
      "AV AV": { width: 120, actualBoundingBoxRight: 120 },
      "AV ": { width: 60 },
      AV: { actualBoundingBoxRight: 102 },
    });
    const clip = { ...title("AV AV"), karaoke: { mode: "fill" as const, color: "red" } };
    expect(textBounds(ctx, clip).width).toBe(206);
  });

  it.each(["left", "center", "right"] as const)("encloses multiline %s aligned text", (align) => {
    const ctx = context({ A: { actualBoundingBoxLeft: 12, actualBoundingBoxRight: 62 } });
    const clip = title("AAAA\nA", { align, stroke: { color: "red", width: 20 } });
    const bounds = textBounds(ctx, clip);
    expect(bounds.width).toBe(align === "center" ? 242 : 266);
    expect(bounds.height).toBe(272);
  });

  it("includes directional shadows and glow without changing the layout", () => {
    const ctx = context();
    const shadow = title("AV", { shadow: { color: "black", x: 0.5, y: -0.8, blur: 0.2 } });
    expect(textBounds(ctx, shadow)).toEqual({ width: 262, height: 292 });
    const glow = title("AV", { glow: { color: "red", size: 0.4 } });
    expect(textBounds(ctx, glow)).toEqual({ width: 222, height: 192 });
  });

  it("includes the fallback padding on word highlight boxes", () => {
    const clip = title("AV", { highlight: { mode: "word", color: "red", padding: 0 } });
    expect(textBounds(context(), clip).width).toBe(126);
  });
});
