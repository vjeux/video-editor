import { describe, expect, it } from "vite-plus/test";
import type { EffectDefinition, EffectKind } from "../../core/types";
import { BLUR_EFFECTS } from "./blur";
import { COLOR_EFFECTS } from "./color";
import { DISTORT_EFFECTS } from "./distort";
import { BUILTIN_EFFECTS, EFFECT_CATEGORIES } from "./index";
import { MOTION_EFFECTS } from "./motion";
import { REVEAL_EFFECTS } from "./reveals";
import { STYLIZE_EFFECTS } from "./stylize";
import { TRANSITIONS } from "./transitions";

const GROUPS: { category: string; kind: EffectKind; defs: readonly EffectDefinition[] }[] = [
  { category: "Color", kind: "effect", defs: COLOR_EFFECTS },
  { category: "Motion", kind: "effect", defs: MOTION_EFFECTS },
  { category: "Blur", kind: "effect", defs: BLUR_EFFECTS },
  { category: "Stylize", kind: "effect", defs: STYLIZE_EFFECTS },
  { category: "Distort", kind: "effect", defs: DISTORT_EFFECTS },
  { category: "Reveal", kind: "effect", defs: REVEAL_EFFECTS },
  { category: "Transitions", kind: "transition", defs: TRANSITIONS },
];

const ALL = GROUPS.flatMap((group) => group.defs);

/** Ids of definitions failing `test`, so a failure names the culprits. */
const offenders = (test: (def: EffectDefinition) => boolean) =>
  ALL.filter((def) => !test(def)).map((def) => def.id);

describe("built-in effect library", () => {
  it("keys every definition by a unique id", () => {
    const ids = ALL.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(BUILTIN_EFFECTS).toSorted()).toEqual(ids.toSorted());
  });

  it.each(GROUPS)("files $category shaders as $kind in $category", ({ category, kind, defs }) => {
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.filter((def) => def.kind !== kind || def.category !== category)).toEqual([]);
  });

  it("lists categories in display order", () => {
    expect(EFFECT_CATEGORIES).toEqual(GROUPS.map((group) => group.category));
  });

  it("names and describes every definition", () => {
    expect(offenders((def) => def.name !== "Untitled effect" && def.description !== "")).toEqual(
      [],
    );
  });

  it("gives numeric params a slider range containing the default", () => {
    const bad = ALL.flatMap((def) =>
      def.params
        .filter((param) => param.type === "float" || param.type === "int")
        .filter(
          ({ min, max, default: value }) =>
            min === undefined ||
            max === undefined ||
            typeof value !== "number" ||
            !(min <= value && value <= max),
        )
        .map((param) => `${def.id}.${param.key}`),
    );
    expect(bad).toEqual([]);
  });

  it("declares a default for every parameter uniform", () => {
    expect(offenders((def) => !/^\s*uniform\s+\w+\s+\w+\s*;\s*$/m.test(def.source))).toEqual([]);
  });

  it("provides the reveal effects used by enter/exit animations", () => {
    const ids = [
      "reveal-wipe",
      "reveal-iris",
      "reveal-blur",
      "reveal-pixelate",
      "reveal-glitch",
      "reveal-dissolve",
    ];
    expect(ids.map((id) => BUILTIN_EFFECTS[id]?.kind)).toEqual(ids.map(() => "effect"));
  });

  it("leaves the renderer's wrapper declarations to the renderer", () => {
    const forbidden = [
      /void\s+main\s*\(/,
      /#version/,
      /\bprecision\s+\w+\s+float/,
      /uniform\s+\w+\s+(progress|time|ratio|resolution)\s*;/,
      /\btexture2D\b/,
      /\bgl_FragColor\b/,
    ];
    expect(offenders((def) => forbidden.every((pattern) => !pattern.test(def.source)))).toEqual([]);
  });
});
