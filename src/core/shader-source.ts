import type { EffectDefinition, EffectKind, ParamDef, ParamType, ParamValue } from "./types";

/** Uniforms the renderer provides; never exposed as user parameters. */
const RESERVED = new Set(["progress", "ratio", "time", "resolution", "duration"]);

const ENTRY_POINTS: Record<EffectKind, RegExp> = {
  effect: /vec4\s+effect\s*\(\s*vec2/,
  transition: /vec4\s+transition\s*\(\s*vec2/,
};

const UNIFORM =
  /^[ \t]*uniform\s+(float|int|bool|vec2|ivec2|vec3|vec4)\s+(\w+)\s*;[ \t]*(?:\/\/(.*))?$/gm;

const GLSL_TYPES: Record<string, ParamType> = {
  float: "float",
  int: "int",
  bool: "bool",
  vec2: "vec2",
  ivec2: "vec2",
  vec3: "color",
  vec4: "color",
};

const FALLBACK: Record<ParamType, ParamValue> = {
  float: 0,
  int: 0,
  bool: false,
  vec2: [0, 0],
  color: "#000000",
};

/** "glowAmount" / "glow_amount" → "Glow amount". */
export const humanize = (key: string) => {
  const words = key
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const hex = (n: number) =>
  Math.round(Math.min(1, Math.max(0, n)) * 255)
    .toString(16)
    .padStart(2, "0");

function parseDefault(type: ParamType, text: string): ParamValue {
  const vector = /^i?vec\d\s*\(([^)]*)\)/.exec(text);
  const numbers = (vector?.[1] ?? text).split(",").map((n) => Number.parseFloat(n));
  const [a = 0, b = a, c = b] = numbers;
  const parsers: Record<ParamType, () => ParamValue> = {
    float: () => a,
    int: () => Math.round(a),
    bool: () => text.trim().startsWith("true"),
    vec2: () => [a, b],
    color: () => `#${hex(a)}${hex(b)}${hex(c)}`,
  };
  return parsers[type]();
}

/** Reads `= default, min: 0, max: 1, step: 0.1, label: Text` from a uniform's comment. */
function parseParam(glslType: string, key: string, comment = ""): ParamDef {
  const type = GLSL_TYPES[glslType] ?? "float";
  const body = comment.trim();
  const defaultMatch = /^=\s*(i?vec\d\s*\([^)]*\)|[^,]+)/.exec(body);
  const options = Object.fromEntries(
    [...body.matchAll(/(min|max|step|label)\s*:\s*([^,]+)/g)].map((m) => [
      m[1],
      m[2]?.trim() ?? "",
    ]),
  );
  const number = (value: string | undefined) =>
    value === undefined ? undefined : Number.parseFloat(value);
  return {
    key,
    label: options.label ?? humanize(key),
    type,
    default: defaultMatch?.[1] ? parseDefault(type, defaultMatch[1]) : FALLBACK[type],
    ...(options.min !== undefined && { min: number(options.min) }),
    ...(options.max !== undefined && { max: number(options.max) }),
    ...(options.step !== undefined && { step: number(options.step) }),
  };
}

function metadata(source: string, key: string): string | undefined {
  const tag = new RegExp(`^\\s*//\\s*(?:@${key}\\s+|${key}\\s*:\\s*)(.+)$`, "im").exec(source);
  return tag?.[1]?.trim();
}

/**
 * Builds a definition from GLSL source. Effects define `vec4 effect(vec2 uv)`,
 * transitions `vec4 transition(vec2 uv)` — gl-transitions files work as-is.
 */
export function definitionFromSource(
  source: string,
  id: string,
  fileName?: string,
): EffectDefinition {
  const kind = (Object.keys(ENTRY_POINTS) as EffectKind[]).find((k) =>
    ENTRY_POINTS[k].test(source),
  );
  if (!kind) {
    throw new Error("A shader must define vec4 effect(vec2 uv) or vec4 transition(vec2 uv)");
  }
  const params = [...source.matchAll(UNIFORM)]
    .filter(([, , name]) => name && !RESERVED.has(name))
    .map(([, glslType = "float", name = "", comment]) => parseParam(glslType, name, comment));
  return {
    id,
    name: metadata(source, "name") ?? (fileName ? humanize(fileName) : "Untitled effect"),
    kind,
    category: metadata(source, "category") ?? (fileName ? "Imported" : "Custom"),
    description: metadata(source, "description") ?? "",
    author: metadata(source, "author") ?? "",
    source,
    params,
    lut: null,
  };
}
