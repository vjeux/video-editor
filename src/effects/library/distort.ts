import type { EffectDefinition } from "../../core/types";
import { NOISE, fx } from "./shared";

export const DISTORT_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "bulge",
    `// @name Bulge
// @category Distort
// @description Magnifies a round area like a fisheye; negative strength pinches it instead.
uniform float strength; // = 0.5, min: -1, max: 1
uniform float radius; // = 0.5, min: 0.05, max: 1.5
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 effect(vec2 uv) {
  vec2 p = (uv - center) * vec2(ratio, 1.0);
  float t = length(p) / radius;
  if (t >= 1.0) return getColor(uv);
  // Falloff with zero slope at the rim, so there is no visible seam.
  float w = (1.0 - t * t) * (1.0 - t * t);
  float k = 1.0 - 0.9 * strength * w;
  return getColor(clamp(p * k / vec2(ratio, 1.0) + center, 0.0, 1.0));
}`,
  ),

  fx(
    "swirl",
    `// @name Swirl
// @category Distort
// @description Twists the image around a centre, most strongly in the middle.
uniform float angle; // = 180, min: -720, max: 720, label: Angle (degrees)
uniform float radius; // = 0.5, min: 0.05, max: 1.5
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 effect(vec2 uv) {
  vec2 p = (uv - center) * vec2(ratio, 1.0);
  float t = length(p) / radius;
  if (t >= 1.0) return getColor(uv);
  float a = radians(angle) * (1.0 - t) * (1.0 - t);
  float s = sin(a);
  float cs = cos(a);
  p = vec2(cs * p.x - s * p.y, s * p.x + cs * p.y);
  return getColor(clamp(p / vec2(ratio, 1.0) + center, 0.0, 1.0));
}`,
  ),

  fx(
    "wave",
    `// @name Wave
// @category Distort
// @description Animated sine-wave displacement, like a flag or heat haze.
uniform float amplitude; // = 0.01, min: 0, max: 0.1
uniform float frequency; // = 6, min: 0.5, max: 40, label: Waves per frame
uniform float speed; // = 1, min: -10, max: 10, label: Speed (waves per second)
uniform bool vertical; // = false, label: Vertical displacement

vec4 effect(vec2 uv) {
  float phase = 6.2831853 * (frequency * (vertical ? uv.x : uv.y) - speed * time);
  vec2 off = vertical ? vec2(0.0, sin(phase)) : vec2(sin(phase), 0.0);
  return getColor(clamp(uv + off * amplitude, 0.0, 1.0));
}`,
  ),

  fx(
    "ripple",
    `// @name Ripple
// @category Distort
// @description Animated rings spreading outward from a point, like a drop in water.
uniform float amplitude; // = 0.012, min: 0, max: 0.08
uniform float wavelength; // = 0.06, min: 0.01, max: 0.5
uniform float speed; // = 0.15, min: -1, max: 1, label: Speed (frame heights per second)
uniform float decay; // = 2, min: 0, max: 10
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 effect(vec2 uv) {
  vec2 p = (uv - center) * vec2(ratio, 1.0);
  float d = length(p);
  if (d < 0.00001) return getColor(uv);
  float wave = sin(6.2831853 * (d - speed * time) / wavelength);
  // Radial displacement that fades with distance from the centre.
  vec2 off = p / d * wave * amplitude * exp(-d * decay);
  return getColor(clamp(uv + off / vec2(ratio, 1.0), 0.0, 1.0));
}`,
  ),

  fx(
    "mirror",
    `// @name Mirror
// @category Distort
// @description Reflects one half of the frame onto the other, or one quarter into all four.
uniform int mode; // = 0, min: 0, max: 2, label: Mode (0 left-right / 1 top-bottom / 2 quad)
uniform bool flip; // = false, label: Mirror the other half

float mirrorAxis(float x) {
  return flip ? max(x, 1.0 - x) : min(x, 1.0 - x);
}

vec4 effect(vec2 uv) {
  vec2 p = uv;
  if (mode != 1) p.x = mirrorAxis(p.x);
  if (mode != 0) p.y = mirrorAxis(p.y);
  return getColor(p);
}`,
  ),

  fx(
    "shake",
    `// @name Shake
// @category Distort
// @description Handheld camera shake: smooth random drift and roll, zoomed to hide the edges.
uniform float intensity; // = 0.4, min: 0, max: 1
uniform float speed; // = 10, min: 0.5, max: 30, label: Frequency
uniform float rotation; // = 2, min: 0, max: 10, label: Max rotation (degrees)
${NOISE}
// Smooth 1D noise in -1..1.
float shakeNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f)) * 2.0 - 1.0;
}

// Two octaves; stays within -1.5..1.5.
float shakeOctaves(float x) {
  return shakeNoise(x) + 0.5 * shakeNoise(x * 2.3 + 11.0);
}

vec4 effect(vec2 uv) {
  float t = mod(time, 500.0) * speed;
  vec2 offset = vec2(shakeOctaves(t), shakeOctaves(t + 37.1)) * 0.03 * intensity;
  float maxAngle = radians(rotation) * intensity;
  float a = maxAngle * clamp(shakeOctaves(t + 71.3) / 1.5, -1.0, 1.0);
  // Enough zoom that the rotated, offset frame still covers the output.
  float zoom = (cos(maxAngle) + max(ratio, 1.0 / ratio) * sin(maxAngle)) / (1.0 - 0.09 * intensity);
  vec2 p = (uv - 0.5) * vec2(ratio, 1.0) / zoom;
  float s = sin(a);
  float cs = cos(a);
  p = vec2(cs * p.x - s * p.y, s * p.x + cs * p.y);
  return getColor(clamp(p / vec2(ratio, 1.0) + 0.5 + offset, 0.0, 1.0));
}`,
  ),

  fx(
    "lens-distortion",
    `// @name Lens Distortion
// @category Distort
// @description Barrel (positive) or pincushion (negative) lens warp with optional colour fringing.
uniform float strength; // = 0.25, min: -0.5, max: 1, label: Distortion
uniform float dispersion; // = 0.02, min: 0, max: 0.2, label: Color fringing
uniform bool fit; // = true, label: Fit to frame

vec2 lensWarp(vec2 uv, float k, float scale) {
  // Normalised so the frame corners sit at radius 1.
  vec2 axis = vec2(ratio, 1.0) / length(vec2(ratio, 1.0));
  vec2 p = (uv - 0.5) * 2.0 * axis;
  p *= (1.0 + k * dot(p, p)) * scale;
  return p / axis * 0.5 + 0.5;
}

// Transparent outside the source image.
vec4 lensSample(vec2 q) {
  vec2 inside = step(vec2(0.0), q) * step(q, vec2(1.0));
  return getColor(clamp(q, 0.0, 1.0)) * inside.x * inside.y;
}

vec4 effect(vec2 uv) {
  // Barrel distortion pulls the corners in from outside the frame; scale them back.
  float reach = strength + dispersion;
  float scale = fit && reach > 0.0 ? 1.0 / (1.0 + reach) : 1.0;
  vec4 r = lensSample(lensWarp(uv, strength + dispersion, scale));
  vec4 g = lensSample(lensWarp(uv, strength, scale));
  vec4 b = lensSample(lensWarp(uv, strength - dispersion, scale));
  float alpha = max(g.a, max(r.a, b.a));
  vec3 premul = vec3(r.r * r.a, g.g * g.a, b.b * b.a);
  return vec4(alpha > 0.0001 ? clamp(premul / alpha, 0.0, 1.0) : vec3(0.0), alpha);
}`,
  ),
];
