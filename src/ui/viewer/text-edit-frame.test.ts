import { describe, expect, it } from "vite-plus/test";
import { textEditFrame } from "./text-edit-frame";

describe("textEditFrame", () => {
  it("uses the text layout so outline and shadow bounds do not shift the caret", () => {
    const box = { cx: 960, cy: 540, width: 680, height: 300, rotation: 12 };
    const frame = textEditFrame(
      box,
      { width: 300, height: 110, padding: 20, lineHeight: 110 },
      { fontSize: 96, letterSpacing: 2 },
      { display: 0.5, clip: 2 },
    );
    expect(frame).toEqual({
      left: 330,
      top: 215,
      width: 300,
      height: 110,
      rotation: 12,
      fontSize: 96,
      lineHeight: 110,
      padding: 20,
      letterSpacing: 2,
    });
  });
});
