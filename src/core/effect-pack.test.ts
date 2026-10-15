import { describe, expect, it } from "vite-plus/test";
import { parseEffectPack, serializeEffectPack } from "./effect-pack";
import { lutDefinition, parseCubeLut } from "./lut";
import { definitionFromSource } from "./shader-source";

const source = `// @name Tint
uniform vec3 color; // = vec3(1.0, 0.0, 0.0)
vec4 effect(vec2 uv) { return getColor(uv) * vec4(color, 1.0); }`;

describe("effect packs", () => {
  it("round-trips definitions through JSON with fresh ids", () => {
    const def = definitionFromSource(source, "tint");
    const json = serializeEffectPack([def]);
    const [imported] = parseEffectPack(json, () => "new-id");
    expect(imported).toEqual({ ...def, id: "new-id" });
  });

  it("re-derives parameters from the source instead of trusting the file", () => {
    const def = definitionFromSource(source, "tint");
    const tampered = JSON.parse(serializeEffectPack([def])) as {
      effects: Record<string, unknown>[];
    };
    tampered.effects[0]!.params = [{ key: "evil", type: "float", default: 1 }];
    const [imported] = parseEffectPack(JSON.stringify(tampered), () => "x");
    expect(imported?.params.map((p) => p.key)).toEqual(["color"]);
  });

  it("rejects files that are not effect packs", () => {
    expect(() => parseEffectPack("{}", () => "x")).toThrow(/not a Cutline effect pack/);
    expect(() => parseEffectPack("nope", () => "x")).toThrow();
  });
});

describe("lutDefinition", () => {
  it("wraps a .cube table in an intensity-controlled effect", () => {
    const cube = parseCubeLut(`TITLE "Teal"\nLUT_3D_SIZE 2\n${"0 0 0\n".repeat(8)}`);
    const def = lutDefinition(cube, "lut-1", "teal.cube");
    expect(def).toMatchObject({ id: "lut-1", name: "Teal", kind: "effect", category: "LUT" });
    expect(def.lut?.size).toBe(2);
    expect(def.params.map((p) => p.key)).toEqual(["intensity"]);
  });
});
