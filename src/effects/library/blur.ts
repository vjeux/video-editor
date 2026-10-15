import type { EffectDefinition } from "../../core/types";
import { DISC_BLUR, JITTER, LUMA, PREMUL, fx } from "./shared";

export const BLUR_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "gaussian-blur",
    `// @name Gaussian Blur
// @category Blur
// @description Smooth, even blur; the radius is in pixels of the output frame.
uniform float radius; // = 8, min: 0, max: 64, label: Radius (px)
${PREMUL}${JITTER}${DISC_BLUR}
vec4 effect(vec2 uv) {
  if (radius < 0.5) return getColor(uv);
  return discBlur(uv, vec2(radius) / resolution);
}`,
  ),

  fx(
    "zoom-blur",
    `// @name Zoom Blur
// @category Blur
// @description Streaks radiating from a point, like zooming the lens during the exposure.
uniform float strength; // = 0.2, min: 0, max: 1
uniform vec2 center; // = vec2(0.5, 0.5)
${PREMUL}${JITTER}
vec4 effect(vec2 uv) {
  if (strength <= 0.0) return getColor(uv);
  float j = jitter(uv);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 32; i++) {
    // Taps run from the pixel toward the centre, jittered to hide steps.
    float t = (float(i) + j) / 32.0;
    vec2 p = center + (uv - center) * (1.0 - strength * t);
    acc += premultiply(getColor(clamp(p, 0.0, 1.0)));
  }
  return unpremultiply(acc / 32.0);
}`,
  ),

  fx(
    "motion-blur",
    `// @name Motion Blur
// @category Blur
// @description Directional blur along an angle, like a fast pan.
uniform float strength; // = 24, min: 0, max: 200, label: Distance (px)
uniform float angle; // = 0, min: -180, max: 180, label: Angle (degrees)
${PREMUL}${JITTER}
vec4 effect(vec2 uv) {
  if (strength < 0.5) return getColor(uv);
  float a = radians(angle);
  vec2 dir = vec2(cos(a), sin(a)) * strength / resolution;
  float j = jitter(uv);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 32; i++) {
    float t = (float(i) + j) / 32.0 - 0.5;
    acc += premultiply(getColor(clamp(uv + dir * t, 0.0, 1.0)));
  }
  return unpremultiply(acc / 32.0);
}`,
  ),

  fx(
    "tilt-shift",
    `// @name Tilt-Shift
// @category Blur
// @description Keeps a band in focus and blurs above and below it, for a miniature look.
uniform float focus; // = 0.5, min: 0, max: 1, label: Focus position
uniform float band; // = 0.12, min: 0, max: 0.5, label: Focus width
uniform float falloff; // = 0.25, min: 0.01, max: 1
uniform float radius; // = 10, min: 0, max: 40, label: Blur (px)
uniform float angle; // = 0, min: -90, max: 90, label: Angle (degrees)
uniform float saturation; // = 0.15, min: 0, max: 1, label: Saturation boost
${LUMA}${PREMUL}${JITTER}${DISC_BLUR}
vec4 effect(vec2 uv) {
  // Distance from the focus line, measured across the band in aspect-correct units.
  float a = radians(angle);
  vec2 p = (uv - vec2(0.5, focus)) * vec2(ratio, 1.0);
  float d = abs(dot(p, vec2(-sin(a), cos(a))));
  float px = radius * smoothstep(band, band + falloff, d);
  vec4 c = px < 0.5 ? getColor(uv) : discBlur(uv, vec2(px) / resolution);
  vec3 rgb = mix(vec3(luma(c.rgb)), c.rgb, 1.0 + saturation);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "sharpen",
    `// @name Sharpen
// @category Blur
// @description Unsharp mask: boosts the difference between the image and a slight blur of it.
uniform float amount; // = 0.6, min: 0, max: 3
uniform float radius; // = 1.5, min: 0.5, max: 8, label: Radius (px)
${PREMUL}
vec4 sharpenTap(vec2 uv) {
  return premultiply(getColor(clamp(uv, 0.0, 1.0)));
}

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec4 center = premultiply(c);
  vec2 o = vec2(radius) / resolution;
  // 3x3 tent filter.
  vec4 blur = center * 0.25;
  blur += (sharpenTap(uv + vec2(o.x, 0.0)) + sharpenTap(uv - vec2(o.x, 0.0))
    + sharpenTap(uv + vec2(0.0, o.y)) + sharpenTap(uv - vec2(0.0, o.y))) * 0.125;
  blur += (sharpenTap(uv + o) + sharpenTap(uv - o)
    + sharpenTap(uv + vec2(o.x, -o.y)) + sharpenTap(uv + vec2(-o.x, o.y))) * 0.0625;
  // Sharpen colour only; the layer's coverage stays as it was.
  vec3 rgb = clamp(center.rgb + (center.rgb - blur.rgb) * amount, vec3(0.0), vec3(c.a));
  return vec4(c.a > 0.0001 ? rgb / c.a : vec3(0.0), c.a);
}`,
  ),
];
