import type { EffectDefinition } from "../../core/types";
import { HSV, LUMA, fx } from "./shared";

export const COLOR_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "brightness-contrast",
    `// @name Brightness & Contrast
// @category Color
// @description Lifts or lowers overall brightness and stretches or flattens contrast.
uniform float brightness; // = 0.05, min: -1, max: 1
uniform float contrast; // = 0.15, min: -1, max: 1

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Contrast pivots around mid-grey: -1 flattens to grey, +1 doubles the slope.
  vec3 rgb = (c.rgb + brightness - 0.5) * (1.0 + contrast) + 0.5;
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "exposure",
    `// @name Exposure
// @category Color
// @description Adjusts exposure in photographic stops, with black offset and gamma.
uniform float exposure; // = 0.5, min: -4, max: 4, step: 0.05, label: Exposure (stops)
uniform float offset; // = 0, min: -0.5, max: 0.5, label: Black offset
uniform float gamma; // = 1, min: 0.2, max: 3

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Scale in approximately linear light, so one stop doubles the light.
  vec3 lin = pow(c.rgb, vec3(2.2)) * exp2(exposure);
  vec3 rgb = clamp(pow(lin, vec3(1.0 / 2.2)) + offset, 0.0, 1.0);
  rgb = pow(rgb, vec3(1.0 / gamma));
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "saturation",
    `// @name Saturation
// @category Color
// @description Boosts or mutes colour; vibrance favours colours that are still muted.
uniform float saturation; // = 0.25, min: -1, max: 1
uniform float vibrance; // = 0, min: -1, max: 1
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 rgb = mix(vec3(luma(c.rgb)), c.rgb, 1.0 + saturation);
  // Vibrance scales by how unsaturated the pixel already is.
  float chroma = max(rgb.r, max(rgb.g, rgb.b)) - min(rgb.r, min(rgb.g, rgb.b));
  rgb = mix(vec3(luma(rgb)), rgb, 1.0 + vibrance * (1.0 - clamp(chroma, 0.0, 1.0)));
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "hue-shift",
    `// @name Hue Shift
// @category Color
// @description Rotates every colour around the colour wheel.
uniform float hue; // = 30, min: -180, max: 180, label: Hue (degrees)
${HSV}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 hsv = rgb2hsv(c.rgb);
  hsv.x = fract(hsv.x + hue / 360.0);
  return vec4(clamp(hsv2rgb(hsv), 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "temperature-tint",
    `// @name Temperature & Tint
// @category Color
// @description White balance: warmer or cooler, greener or more magenta.
uniform float temperature; // = 0.2, min: -1, max: 1
uniform float tint; // = 0, min: -1, max: 1
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Channel gains, normalised so overall brightness is preserved.
  vec3 gain = vec3(1.0 + 0.25 * temperature, 1.0 - 0.2 * tint, 1.0 - 0.25 * temperature);
  vec3 rgb = c.rgb * gain / luma(gain);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "lift-gamma-gain",
    `// @name Lift / Gamma / Gain
// @category Color
// @description Three colour wheels for shadows, midtones and highlights; mid-grey is neutral.
uniform vec3 lift; // = vec3(0.46, 0.5, 0.56), label: Lift (shadows)
uniform vec3 gamma; // = vec3(0.5, 0.5, 0.5), label: Gamma (midtones)
uniform vec3 gain; // = vec3(0.54, 0.5, 0.46), label: Gain (highlights)

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Each wheel is read relative to mid-grey, so 0.5 leaves the image untouched.
  vec3 g = exp2((gain - 0.5) * 2.0);
  vec3 l = (lift - 0.5) * 0.5;
  vec3 e = exp2((0.5 - gamma) * 2.0);
  vec3 rgb = c.rgb * g;
  rgb = rgb + l * (1.0 - rgb);
  rgb = pow(clamp(rgb, 0.0, 1.0), e);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "black-white",
    `// @name Black & White
// @category Color
// @description Converts to monochrome with adjustable channel mix, like coloured lens filters.
uniform float amount; // = 1, min: 0, max: 1
uniform float red; // = 0.3, min: -1, max: 2, label: Reds
uniform float green; // = 0.59, min: -1, max: 2, label: Greens
uniform float blue; // = 0.11, min: -1, max: 2, label: Blues

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float grey = clamp(dot(c.rgb, vec3(red, green, blue)), 0.0, 1.0);
  return vec4(mix(c.rgb, vec3(grey), amount), c.a);
}`,
  ),

  fx(
    "sepia",
    `// @name Sepia
// @category Color
// @description Warm brown monochrome of old photographs.
uniform float amount; // = 0.8, min: 0, max: 1

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 sepia = vec3(
    dot(c.rgb, vec3(0.393, 0.769, 0.189)),
    dot(c.rgb, vec3(0.349, 0.686, 0.168)),
    dot(c.rgb, vec3(0.272, 0.534, 0.131))
  );
  return vec4(mix(c.rgb, clamp(sepia, 0.0, 1.0), amount), c.a);
}`,
  ),

  fx(
    "invert",
    `// @name Invert
// @category Color
// @description Turns the image into its negative.
uniform float amount; // = 1, min: 0, max: 1

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  return vec4(mix(c.rgb, 1.0 - c.rgb, amount), c.a);
}`,
  ),

  fx(
    "duotone",
    `// @name Duotone
// @category Color
// @description Maps shadows and highlights onto two colours.
uniform vec3 shadows; // = vec3(0.12, 0.06, 0.35)
uniform vec3 highlights; // = vec3(1.0, 0.78, 0.45)
uniform float contrast; // = 0, min: -1, max: 1
uniform float amount; // = 1, min: 0, max: 1
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float l = clamp((luma(c.rgb) - 0.5) * (1.0 + contrast) + 0.5, 0.0, 1.0);
  return vec4(mix(c.rgb, mix(shadows, highlights, l), amount), c.a);
}`,
  ),

  fx(
    "posterize",
    `// @name Posterize
// @category Color
// @description Reduces each channel to a few flat levels.
uniform int levels; // = 6, min: 2, max: 32

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float n = max(float(levels - 1), 1.0);
  return vec4(floor(c.rgb * n + 0.5) / n, c.a);
}`,
  ),

  fx(
    "threshold",
    `// @name Threshold
// @category Color
// @description Splits the image into two colours at a brightness level.
uniform float level; // = 0.5, min: 0, max: 1, label: Threshold
uniform float softness; // = 0.02, min: 0, max: 0.5
uniform vec3 dark; // = vec3(0.0, 0.0, 0.0)
uniform vec3 light; // = vec3(1.0, 1.0, 1.0)
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float s = max(softness, 0.0001);
  float v = smoothstep(level - s, level + s, luma(c.rgb));
  return vec4(mix(dark, light, v), c.a);
}`,
  ),

  fx(
    "fade",
    `// @name Fade
// @category Color
// @description Lifts the blacks to a soft matte and mutes colour, like faded film.
uniform float amount; // = 0.5, min: 0, max: 1
uniform vec3 matte; // = vec3(0.16, 0.15, 0.18), label: Black point
uniform float mute; // = 0.25, min: 0, max: 1, label: Desaturate
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 rgb = mix(c.rgb, vec3(luma(c.rgb)), mute * amount);
  // Remap 0..1 onto the matte black .. a slightly dimmed white.
  vec3 black = matte * amount;
  rgb = black + rgb * (vec3(1.0 - 0.06 * amount) - black);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "color-isolate",
    `// @name Color Isolate
// @category Color
// @description Keeps one hue in colour and turns everything else black and white.
uniform vec3 target; // = vec3(0.85, 0.12, 0.12), label: Keep color
uniform float range; // = 0.06, min: 0, max: 0.5, label: Hue range
uniform float softness; // = 0.05, min: 0, max: 0.3
uniform float amount; // = 1, min: 0, max: 1
${LUMA}${HSV}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 hsv = rgb2hsv(c.rgb);
  // Circular hue distance, 0..0.5.
  float d = abs(hsv.x - rgb2hsv(target).x);
  d = min(d, 1.0 - d);
  float keep = 1.0 - smoothstep(range, range + max(softness, 0.0001), d);
  // Near-grey pixels have no reliable hue, so they go grey too.
  keep *= smoothstep(0.08, 0.25, hsv.y);
  vec3 grey = vec3(luma(c.rgb));
  return vec4(mix(c.rgb, grey, amount * (1.0 - keep)), c.a);
}`,
  ),
];
