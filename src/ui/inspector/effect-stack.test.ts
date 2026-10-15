import { describe, expect, it } from "vite-plus/test";
import type { EffectDefinition } from "../../core/types";
import { groupByCategory, indexForSlot, slotAt } from "./effect-stack";

const def = (id: string, kind: EffectDefinition["kind"], category: string): EffectDefinition => ({
  id,
  name: id,
  kind,
  category,
  description: "",
  author: "",
  source: "",
  params: [],
  lut: null,
});

describe("reordering by drop slot", () => {
  it("lands the dragged item in the indicated gap", () => {
    // Stack [a, b, c]: dragging a below c (gap 3) puts it last.
    expect(indexForSlot(0, 3)).toBe(2);
    // Dragging c above a (gap 0) puts it first.
    expect(indexForSlot(2, 0)).toBe(0);
    // The gaps on either side of the item leave it where it is.
    expect(indexForSlot(1, 1)).toBe(1);
    expect(indexForSlot(1, 2)).toBe(1);
  });

  it("picks the gap nearest the pointer", () => {
    const rect = { top: 100, height: 40 };
    expect(slotAt(2, 110, rect)).toBe(2);
    expect(slotAt(2, 130, rect)).toBe(3);
  });
});

describe("groupByCategory", () => {
  const defs = [
    def("Blur", "effect", "Stylize"),
    def("Crossfade", "transition", "Basic"),
    def("Grain", "effect", "Film"),
    def("Glow", "effect", "Stylize"),
  ];

  it("keeps one kind, grouped in library order", () => {
    expect(groupByCategory(defs, "effect", "")).toEqual([
      { name: "Stylize", effects: [defs[0], defs[3]] },
      { name: "Film", effects: [defs[2]] },
    ]);
  });

  it("filters by name or category, ignoring case", () => {
    expect(groupByCategory(defs, "effect", " GL ").map((c) => c.effects.map((d) => d.id))).toEqual([
      ["Glow"],
    ]);
    expect(groupByCategory(defs, "effect", "film")[0]?.effects.map((d) => d.id)).toEqual(["Grain"]);
  });
});
