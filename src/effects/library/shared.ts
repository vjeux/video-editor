import { definitionFromSource } from "../../core/shader-source";
import type { EffectDefinition } from "../../core/types";

/** Builds a built-in from its GLSL source; name, category and params come from the comment tags. */
export const fx = (id: string, source: string): EffectDefinition =>
  definitionFromSource(source, id);

/*
 * GLSL snippets interpolated into sources. Function names are distinct across
 * snippets so any combination links; dependencies are noted per snippet.
 */

/** Rec. 709 luminance. */
export const LUMA = `
float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
`;

export const HSV = `
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

/** Sine-free hashes (stable across GPUs) and smooth value noise, all in 0..1. */
export const NOISE = `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

/** Averaging straight-alpha samples needs premultiplied space, or transparent pixels darken edges. */
export const PREMUL = `
vec4 premultiply(vec4 c) {
  return vec4(c.rgb * c.a, c.a);
}

vec4 unpremultiply(vec4 c) {
  return vec4(c.a > 0.0001 ? c.rgb / c.a : vec3(0.0), c.a);
}
`;

/** Per-pixel offset in 0..1 (interleaved gradient noise) that turns sampling bands into fine grain. */
export const JITTER = `
float jitter(vec2 uv) {
  vec2 px = uv * resolution;
  return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
}
`;

/** Gaussian blur of the effect input in one pass. Needs PREMUL and JITTER. */
export const DISC_BLUR = `
// 64 taps on a golden-angle spiral cover the disc evenly; Gaussian weights
// (sigma = extent / 3) and a per-pixel spin hide the sparse sampling.
vec4 discBlur(vec2 uv, vec2 extent) {
  float spin = 6.2831853 * jitter(uv);
  vec4 acc = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 64; i++) {
    float f = (float(i) + 0.5) / 64.0;
    float a = float(i) * 2.3999632 + spin;
    vec2 offset = vec2(cos(a), sin(a)) * sqrt(f) * extent;
    float w = exp(-4.5 * f);
    acc += premultiply(getColor(clamp(uv + offset, 0.0, 1.0))) * w;
    total += w;
  }
  return unpremultiply(acc / total);
}
`;

/** Sobel edge magnitude of premultiplied luminance. Needs LUMA. */
export const SOBEL = `
float sobelTap(vec2 uv) {
  vec4 s = getColor(clamp(uv, 0.0, 1.0));
  return luma(s.rgb) * s.a;
}

float sobel(vec2 uv, vec2 o) {
  float tl = sobelTap(uv + vec2(-o.x, o.y));
  float tc = sobelTap(uv + vec2(0.0, o.y));
  float tr = sobelTap(uv + o);
  float ml = sobelTap(uv - vec2(o.x, 0.0));
  float mr = sobelTap(uv + vec2(o.x, 0.0));
  float bl = sobelTap(uv - o);
  float bc = sobelTap(uv - vec2(0.0, o.y));
  float br = sobelTap(uv + vec2(o.x, -o.y));
  float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
  float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
  return length(vec2(gx, gy));
}
`;
