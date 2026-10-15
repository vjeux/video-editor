import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { HOST_API } from "./host-api";

const BUILTINS: readonly [label: string, detail: string, info: string][] = [
  ["mix", "(a, b, t)", "Linear blend: a * (1 - t) + b * t."],
  ["smoothstep", "(edge0, edge1, x)", "Smooth Hermite ramp between two edges."],
  ["step", "(edge, x)", "0 below edge, 1 at or above it."],
  ["clamp", "(x, min, max)", "Constrain x to a range."],
  ["fract", "(x)", "Fractional part, x - floor(x)."],
  ["floor", "(x)", "Round down."],
  ["ceil", "(x)", "Round up."],
  ["round", "(x)", "Round to the nearest integer."],
  ["mod", "(x, y)", "x modulo y."],
  ["abs", "(x)", "Absolute value."],
  ["sign", "(x)", "-1, 0 or 1."],
  ["min", "(a, b)", "Smaller value."],
  ["max", "(a, b)", "Larger value."],
  ["pow", "(x, y)", "x raised to y."],
  ["exp", "(x)", "e raised to x."],
  ["log", "(x)", "Natural logarithm."],
  ["sqrt", "(x)", "Square root."],
  ["inversesqrt", "(x)", "1 / sqrt(x)."],
  ["sin", "(angle)", "Sine (radians)."],
  ["cos", "(angle)", "Cosine (radians)."],
  ["tan", "(angle)", "Tangent (radians)."],
  ["atan", "(y, x)", "Angle of a vector, in radians."],
  ["radians", "(degrees)", "Degrees to radians."],
  ["degrees", "(radians)", "Radians to degrees."],
  ["length", "(v)", "Vector length."],
  ["distance", "(a, b)", "Distance between two points."],
  ["dot", "(a, b)", "Dot product."],
  ["cross", "(a, b)", "Cross product of two vec3."],
  ["normalize", "(v)", "Unit vector in the same direction."],
  ["reflect", "(i, n)", "Reflection direction."],
  ["texture", "(sampler, uv)", "Sample a texture (prefer the get*Color helpers)."],
];

const TYPES = [
  "float",
  "int",
  "bool",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "bvec2",
  "mat2",
  "mat3",
  "mat4",
] as const;

const KEYWORDS = [
  "uniform",
  "const",
  "if",
  "else",
  "for",
  "while",
  "return",
  "break",
  "continue",
  "discard",
  "in",
  "out",
  "inout",
  "true",
  "false",
  "struct",
] as const;

/** Parameter declarations with the comment syntax that turns them into controls. */
const PARAM_SNIPPETS: readonly Completion[] = [
  snippetCompletion(
    "uniform float #{1:amount}; // = #{2:0.5}, min: #{3:0}, max: #{4:1}, label: #{5:Amount}",
    { label: "uniform float", detail: "slider parameter", type: "keyword", boost: 1 },
  ),
  snippetCompletion(
    "uniform int #{1:count}; // = #{2:4}, min: #{3:1}, max: #{4:16}, label: #{5:Count}",
    {
      label: "uniform int",
      detail: "integer parameter",
      type: "keyword",
    },
  ),
  snippetCompletion("uniform bool #{1:enabled}; // = #{2:true}, label: #{3:Enabled}", {
    label: "uniform bool",
    detail: "toggle parameter",
    type: "keyword",
  }),
  snippetCompletion(
    "uniform vec3 #{1:tint}; // = vec3(#{2:1.0}, #{3:0.6}, #{4:0.3}), label: #{5:Tint}",
    {
      label: "uniform vec3",
      detail: "colour parameter",
      type: "keyword",
    },
  ),
  snippetCompletion("uniform vec2 #{1:center}; // = vec2(#{2:0.5}, #{3:0.5}), label: #{4:Center}", {
    label: "uniform vec2",
    detail: "point parameter",
    type: "keyword",
  }),
];

const OPTIONS: readonly Completion[] = [
  ...HOST_API.map((s) => ({
    label: s.label,
    type: s.kind,
    detail: s.signature,
    info: s.info,
    boost: 2,
  })),
  ...BUILTINS.map(([label, detail, info]) => ({ label, detail, info, type: "function" })),
  ...TYPES.map((label) => ({ label, type: "type" })),
  ...KEYWORDS.map((label) => ({ label, type: "keyword" })),
  ...PARAM_SNIPPETS,
];

const COMMENT = /Comment$/;

/** Completion source for the shader host API, GLSL builtins and parameter snippets. */
export function glslCompletions(context: CompletionContext): CompletionResult | null {
  if (COMMENT.test(syntaxTree(context.state).resolveInner(context.pos, -1).name)) return null;
  const word = context.matchBefore(/\w+/);
  if (!word && !context.explicit) return null;
  // `color.rgb` and friends are swizzles, not identifiers.
  if (word && context.state.sliceDoc(word.from - 1, word.from) === ".") return null;
  return { from: word?.from ?? context.pos, options: OPTIONS, validFor: /^\w*$/ };
}
