import { describe, expect, it } from "vite-plus/test";
import {
  animationDurationFromDrag,
  chipWidth,
  fitChips,
  transitionDurationFromDrag,
} from "./fx-geometry";

describe("fitChips", () => {
  it("shows every chip that fits", () => {
    expect(fitChips(["Sepia", "Glow"], 400)).toEqual({ shown: 2, hidden: 0 });
  });

  it("keeps room for a +N counter when some do not fit", () => {
    const names = ["Sepia", "Temperature & tint", "Posterize"];
    const room = chipWidth("Sepia") + chipWidth("+2") + 4;
    expect(fitChips(names, room)).toEqual({ shown: 1, hidden: 2 });
  });

  it("collapses to the counter alone in a narrow clip", () => {
    expect(fitChips(["Sepia", "Glow"], 30)).toEqual({ shown: 0, hidden: 2 });
    expect(fitChips(["Sepia"], 4)).toEqual({ shown: 0, hidden: 0 });
  });
});

describe("animationDurationFromDrag", () => {
  it("grows an enter animation as its inner edge moves right", () => {
    expect(animationDurationFromDrag(0.5, "in", 0.25)).toBe(0.75);
  });

  it("grows an exit animation as its inner edge moves left", () => {
    expect(animationDurationFromDrag(0.5, "out", -0.25)).toBe(0.75);
  });

  it("never drops below a tenth of a second", () => {
    expect(animationDurationFromDrag(0.5, "in", -2)).toBe(0.1);
  });
});

describe("transitionDurationFromDrag", () => {
  it("resizes symmetrically about the cut from either edge", () => {
    expect(transitionDurationFromDrag(1, "end", 0.25)).toBe(1.5);
    expect(transitionDurationFromDrag(1, "start", 0.25)).toBe(0.5);
  });

  it("never drops below a tenth of a second", () => {
    expect(transitionDurationFromDrag(1, "start", 3)).toBe(0.1);
  });
});
