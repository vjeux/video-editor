import { describe, expect, it } from "vite-plus/test";
import { decodeLut, encodeLut, parseCubeLut } from "./lut";
import { definitionFromSource } from "./shader-source";

const glow = `// @name Soft Glow
// @category Light
// @description Blooms highlights.
// @author Ada
uniform float amount; // = 0.6, min: 0, max: 2, label: Glow amount
uniform int steps; // = 8, min: 2, max: 32
uniform bool invert; // = false
uniform vec3 tint; // = vec3(1.0, 0.5, 0.0)
uniform vec2 direction; // = vec2(1.0, -1.0)
uniform float progress;
uniform float bare;

vec4 effect(vec2 uv) {
  return getColor(uv) * amount;
}`;

describe("definitionFromSource", () => {
  it("reads metadata and typed parameters from uniform comments", () => {
    const def = definitionFromSource(glow, "custom-glow");
    expect(def).toMatchObject({
      id: "custom-glow",
      name: "Soft Glow",
      kind: "effect",
      category: "Light",
      description: "Blooms highlights.",
      author: "Ada",
      lut: null,
    });
    expect(def.params).toEqual([
      { key: "amount", label: "Glow amount", type: "float", default: 0.6, min: 0, max: 2 },
      { key: "steps", label: "Steps", type: "int", default: 8, min: 2, max: 32 },
      { key: "invert", label: "Invert", type: "bool", default: false },
      { key: "tint", label: "Tint", type: "color", default: "#ff8000" },
      { key: "direction", label: "Direction", type: "vec2", default: [1, -1] },
      { key: "bare", label: "Bare", type: "float", default: 0 },
    ]);
  });

  it("recognises gl-transitions sources as transitions", () => {
    const source = `// Author: gre
// License: MIT
uniform float smoothness; // = 0.3
vec4 transition (vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}`;
    const def = definitionFromSource(source, "t", "fade.glsl");
    expect(def).toMatchObject({
      kind: "transition",
      name: "Fade",
      author: "gre",
      category: "Imported",
    });
    expect(def.params).toEqual([
      { key: "smoothness", label: "Smoothness", type: "float", default: 0.3 },
    ]);
  });

  it("rejects sources without an entry point", () => {
    expect(() => definitionFromSource("void main() {}", "x")).toThrow(
      /effect\(vec2 uv\)|transition\(vec2 uv\)/,
    );
  });
});

const cube = `TITLE "Warm"
# comment
LUT_3D_SIZE 2
DOMAIN_MIN 0 0 0
DOMAIN_MAX 1 1 1
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1
`;

describe(".cube LUTs", () => {
  it("parses a 3D LUT", () => {
    const lut = parseCubeLut(cube);
    expect(lut.title).toBe("Warm");
    expect(lut.size).toBe(2);
    expect([...lut.data]).toEqual([
      0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1,
    ]);
  });

  it("rejects malformed tables", () => {
    expect(() => parseCubeLut("LUT_3D_SIZE 2\n0 0 0\n")).toThrow(/expected 8/);
    expect(() => parseCubeLut("0 0 0\n")).toThrow(/LUT_3D_SIZE/);
  });

  it("round-trips through the compact RGB8 encoding", () => {
    const lut = parseCubeLut(cube);
    const decoded = decodeLut(encodeLut(lut.data));
    expect([...decoded]).toEqual([...lut.data].map((v) => Math.round(v * 255)));
  });
});
