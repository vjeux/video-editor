import type { EffectDefinition } from "../../core/types";
import { DISC_BLUR, JITTER, NOISE, PREMUL, fx } from "./shared";

/*
 * Enter/exit animation effects (ids referenced by core/clip-animations).
 * `progress` 0 is fully hidden and 1 the untouched input; eased progress can
 * overshoot, so it is clamped, and 1 short-circuits to the exact input.
 */
export const REVEAL_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "reveal-wipe",
    `// @name Wipe Reveal
// @category Reveal
// @description Uncovers the layer behind a soft edge sweeping across the frame.
uniform vec2 direction; // = vec2(1.0, 0.0)
uniform float softness; // = 0.15, min: 0, max: 1

vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  vec4 c = getColor(uv);
  vec2 dir = length(direction) > 0.0001 ? normalize(direction) : vec2(1.0, 0.0);
  float t = dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5;
  float s = max(softness, 0.0001);
  float edge = p * (1.0 + s);
  return vec4(c.rgb, c.a * (1.0 - smoothstep(edge - s, edge, t)));
}`,
  ),

  fx(
    "reveal-iris",
    `// @name Iris Reveal
// @category Reveal
// @description Uncovers the layer inside a growing circle.
uniform vec2 center; // = vec2(0.5, 0.5)
uniform float softness; // = 0.08, min: 0, max: 0.5

vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  vec4 c = getColor(uv);
  vec2 aspect = vec2(ratio, 1.0);
  float reach = length(max(center, 1.0 - center) * aspect);
  float s = max(softness, 0.0001);
  float r = p * (reach + s);
  return vec4(c.rgb, c.a * (1.0 - smoothstep(r - s, r, length((uv - center) * aspect))));
}`,
  ),

  fx(
    "reveal-blur",
    `// @name Blur Reveal
// @category Reveal
// @description Fades in from a heavy blur to sharp focus.
uniform float radius; // = 40, min: 0, max: 64, label: Start blur (px)
${PREMUL}${JITTER}${DISC_BLUR}
vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  float r = radius * (1.0 - p) * (1.0 - p);
  vec4 c = r < 0.5 ? getColor(uv) : discBlur(uv, vec2(r) / resolution);
  return vec4(c.rgb, c.a * smoothstep(0.0, 0.7, p));
}`,
  ),

  fx(
    "reveal-pixelate",
    `// @name Pixelate Reveal
// @category Reveal
// @description Fades in from coarse blocks that refine into the full-resolution layer.
uniform float size; // = 40, min: 2, max: 200, label: Start cell size (px)
${PREMUL}
vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  float cellPx = max(1.0, floor(mix(1.0, size, (1.0 - p) * (1.0 - p))));
  vec4 c = getColor(uv);
  if (cellPx > 1.0) {
    vec2 cell = vec2(cellPx) / resolution;
    vec2 base = floor(uv / cell) * cell;
    // Four taps per cell so thin glyph strokes don't vanish or flicker.
    vec4 acc = vec4(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 o = vec2(float(i % 2), float(i / 2)) * 0.5 + 0.25;
      acc += premultiply(getColor(clamp(base + o * cell, 0.0, 1.0)));
    }
    c = unpremultiply(acc * 0.25);
  }
  return vec4(c.rgb, c.a * smoothstep(0.0, 0.6, p));
}`,
  ),

  fx(
    "reveal-glitch",
    `// @name Glitch Reveal
// @category Reveal
// @description Materialises block by block through flicker, jumping slices and split colour.
uniform float split; // = 16, min: 0, max: 60, label: RGB split (px)
uniform float blocks; // = 0.5, min: 0, max: 1, label: Slice displacement
${NOISE}
vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  float g = 1.0 - p;
  float tick = floor(p * 20.0);
  // Horizontal slices jump sideways; the slicing changes every tick.
  float slice = floor(uv.y * (12.0 + floor(hash12(vec2(tick, 2.3)) * 20.0)));
  float jump = step(0.55, hash12(vec2(slice, tick))) * (hash12(vec2(slice, tick + 9.0)) - 0.5) * 0.15 * blocks * g;
  vec2 q = vec2(uv.x + jump, uv.y);
  vec2 off = vec2(split * g * g / resolution.x, 0.0);
  vec4 r = getColor(clamp(q + off, 0.0, 1.0));
  vec4 gc = getColor(clamp(q, 0.0, 1.0));
  vec4 b = getColor(clamp(q - off, 0.0, 1.0));
  float alpha = max(gc.a, max(r.a, b.a));
  vec3 rgb = alpha > 0.0001 ? vec3(r.r * r.a, gc.g * gc.a, b.b * b.a) / alpha : vec3(0.0);
  // Blocks pop in at random moments; the whole layer flickers early on.
  float visible = step(hash12(floor(uv * vec2(ratio, 1.0) * 10.0) + 0.37) * 0.85, p);
  float flicker = mix(step(0.35, hash12(vec2(tick, 5.1))), 1.0, smoothstep(0.4, 0.8, p));
  return vec4(clamp(rgb, 0.0, 1.0), alpha * visible * flicker);
}`,
  ),

  fx(
    "reveal-dissolve",
    `// @name Dissolve Reveal
// @category Reveal
// @description Appears in organic, grainy patches, optionally with a glowing burn edge.
uniform float scale; // = 18, min: 1, max: 100, label: Pattern scale
uniform float softness; // = 0.15, min: 0.01, max: 0.5
uniform float edgeGlow; // = 0, min: 0, max: 1
uniform vec3 edgeColor; // = vec3(1.0, 0.75, 0.35)
${NOISE}
vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  if (p >= 1.0) return getColor(uv);
  vec4 c = getColor(uv);
  vec2 q = uv * vec2(ratio, 1.0) * scale;
  float n = valueNoise(q) * 0.65 + valueNoise(q * 2.7 + 13.1) * 0.35;
  n = mix(smoothstep(0.15, 0.85, n), hash12(floor(uv * resolution)), 0.25);
  float m = smoothstep(n, n + softness, p * (1.0 + softness));
  // Pixels mid-way through appearing can burn with the edge colour.
  float rim = clamp(m * (1.0 - m) * 4.0 * edgeGlow, 0.0, 1.0);
  return vec4(mix(c.rgb, edgeColor, rim), c.a * m);
}`,
  ),
];
