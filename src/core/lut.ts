import { definitionFromSource, humanize } from "./shader-source";
import type { EffectDefinition } from "./types";

export interface CubeLut {
  title: string;
  size: number;
  /** RGB triplets, red varying fastest, in the 0–1 domain. */
  data: Float32Array;
}

const MAX_SIZE = 65;

/** Parses an Adobe/Resolve `.cube` 3D LUT. */
export function parseCubeLut(text: string): CubeLut {
  let title = "";
  let size = 0;
  let min = [0, 0, 0];
  let max = [1, 1, 1];
  const values: number[] = [];
  const triple = (rest: string[]) => rest.slice(0, 3).map(Number);

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [keyword = "", ...rest] = line.split(/\s+/);
    if (keyword === "TITLE") title = line.slice(5).trim().replace(/^"|"$/g, "");
    else if (keyword === "LUT_3D_SIZE") size = Number(rest[0]);
    else if (keyword === "LUT_1D_SIZE")
      throw new Error("1D LUTs are not supported; export a 3D .cube");
    else if (keyword === "DOMAIN_MIN") min = triple(rest);
    else if (keyword === "DOMAIN_MAX") max = triple(rest);
    else if (/^[-\d.]/.test(keyword)) values.push(...triple([keyword, ...rest]));
  }

  if (!size) throw new Error("Missing LUT_3D_SIZE");
  if (size < 2 || size > MAX_SIZE) throw new Error(`LUT size ${size} is outside 2–${MAX_SIZE}`);
  const expected = size ** 3;
  if (values.length !== expected * 3) {
    throw new Error(`LUT has ${values.length / 3} entries; expected ${expected}`);
  }
  const data = Float32Array.from(values, (v, i) => {
    const ch = i % 3;
    return (v - (min[ch] ?? 0)) / ((max[ch] ?? 1) - (min[ch] ?? 0));
  });
  return { title, size, data };
}

/** Packs a LUT as base64 RGB8 so it can live in the project JSON. */
export function encodeLut(data: Float32Array): string {
  const bytes = Uint8Array.from(data, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export const decodeLut = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** The shader every LUT effect shares; the table itself is uploaded as a 3D texture. */
export const LUT_SOURCE = `// @name LUT
// @category LUT
uniform float intensity; // = 1, min: 0, max: 1, label: Intensity
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  return vec4(mix(c.rgb, applyLut(c.rgb), intensity), c.a);
}`;

/** Wraps a parsed `.cube` table as a colour-grading effect. */
export function lutDefinition(lut: CubeLut, id: string, fileName: string): EffectDefinition {
  return {
    ...definitionFromSource(LUT_SOURCE, id),
    name: lut.title || humanize(fileName),
    category: "LUT",
    description: `${lut.size}³ colour lookup table`,
    lut: { size: lut.size, data: encodeLut(lut.data) },
  };
}
