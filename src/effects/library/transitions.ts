import type { EffectDefinition } from "../../core/types";
import { JITTER, LUMA, NOISE, fx } from "./shared";

/** Unit direction from a user vec2 (falls back to rightward), scaled so its larger axis is 1. */
const DIRECTION = `
vec2 axisDirection(vec2 v) {
  vec2 d = length(v) > 0.0001 ? normalize(v) : vec2(1.0, 0.0);
  return d / max(abs(d.x), abs(d.y));
}

bool insideFrame(vec2 p) {
  return p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
}
`;

const fadeThrough = (id: string, name: string, color: string) =>
  fx(
    id,
    `// @name ${name}
// @category Transitions
// @description Fades out to a solid colour, holds briefly, then fades in the next shot.
uniform vec3 color; // = ${color}
uniform float hold; // = 0.1, min: 0, max: 0.8

vec4 transition(vec2 uv) {
  vec4 fill = vec4(color, 1.0);
  float h = hold * 0.5;
  if (progress < 0.5) return mix(getFromColor(uv), fill, smoothstep(0.0, 0.5 - h, progress));
  return mix(fill, getToColor(uv), smoothstep(0.5 + h, 1.0, progress));
}`,
  );

export const TRANSITIONS: readonly EffectDefinition[] = [
  fx(
    "crossfade",
    `// @name Crossfade
// @category Transitions
// @description Blends smoothly from one shot to the next.

vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), progress);
}`,
  ),

  fadeThrough("fade-black", "Fade Through Black", "vec3(0.0, 0.0, 0.0)"),
  fadeThrough("fade-white", "Fade Through White", "vec3(1.0, 1.0, 1.0)"),

  fx(
    "wipe",
    `// @name Wipe
// @category Transitions
// @description A soft edge sweeps across the frame, revealing the next shot.
uniform vec2 direction; // = vec2(1.0, 0.0)
uniform float smoothness; // = 0.1, min: 0, max: 1

vec4 transition(vec2 uv) {
  vec2 dir = length(direction) > 0.0001 ? normalize(direction) : vec2(1.0, 0.0);
  // Position along the wipe: 0 where it starts, 1 where it ends.
  float t = dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5;
  float s = max(smoothness, 0.0001);
  float edge = progress * (1.0 + s);
  float m = 1.0 - smoothstep(edge - s, edge, t);
  return mix(getFromColor(uv), getToColor(uv), m);
}`,
  ),

  fx(
    "slide",
    `// @name Push
// @category Transitions
// @description The next shot pushes the current one out of frame.
uniform vec2 direction; // = vec2(1.0, 0.0)
${DIRECTION}
vec4 transition(vec2 uv) {
  vec2 d = axisDirection(direction);
  float t = clamp(progress, 0.0, 1.0);
  float p = t * t * (3.0 - 2.0 * t);
  vec2 fromUv = uv - d * p;
  if (insideFrame(fromUv)) return getFromColor(fromUv);
  vec2 toUv = fromUv + d;
  if (insideFrame(toUv)) return getToColor(toUv);
  return vec4(0.0, 0.0, 0.0, 1.0);
}`,
  ),

  fx(
    "cover",
    `// @name Cover
// @category Transitions
// @description The next shot slides in over the current one, which darkens beneath it.
uniform vec2 direction; // = vec2(1.0, 0.0)
uniform float shade; // = 0.4, min: 0, max: 1, label: Shadow
${DIRECTION}
vec4 transition(vec2 uv) {
  vec2 d = axisDirection(direction);
  float t = clamp(progress, 0.0, 1.0);
  float p = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);
  vec2 toUv = uv + d * (1.0 - p);
  if (insideFrame(toUv)) return getToColor(toUv);
  vec4 from = getFromColor(uv);
  return vec4(from.rgb * (1.0 - shade * p), from.a);
}`,
  ),

  fx(
    "zoom-in",
    `// @name Zoom In
// @category Transitions
// @description The current shot pushes in while the next one settles from a slight zoom.
uniform float strength; // = 1, min: 0, max: 4, label: Zoom
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  float p = t * t * (3.0 - 2.0 * t);
  vec2 fromUv = center + (uv - center) / (1.0 + strength * p);
  vec2 toUv = center + (uv - center) / (1.0 + strength * 0.25 * (1.0 - p));
  return mix(getFromColor(fromUv), getToColor(toUv), smoothstep(0.25, 0.75, t));
}`,
  ),

  fx(
    "zoom-blur-transition",
    `// @name Zoom Blur
// @category Transitions
// @description Rushes into the centre with a radial blur and out into the next shot.
uniform float strength; // = 0.4, min: 0, max: 1, label: Blur
uniform vec2 center; // = vec2(0.5, 0.5)
${JITTER}
vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  float blur = strength * sin(3.14159265 * t);
  float fromZoom = 1.0 + t * t;
  float toZoom = 1.0 + (1.0 - t) * (1.0 - t);
  float j = jitter(uv);
  vec4 a = vec4(0.0);
  vec4 b = vec4(0.0);
  for (int i = 0; i < 24; i++) {
    float k = 1.0 - blur * (float(i) + j) / 24.0;
    a += getFromColor(center + (uv - center) * k / fromZoom);
    b += getToColor(center + (uv - center) * k / toZoom);
  }
  return mix(a, b, smoothstep(0.35, 0.65, t)) / 24.0;
}`,
  ),

  fx(
    "iris",
    `// @name Iris
// @category Transitions
// @description A growing circle reveals the next shot.
uniform vec2 center; // = vec2(0.5, 0.5)
uniform float smoothness; // = 0.05, min: 0, max: 0.5

vec4 transition(vec2 uv) {
  vec2 aspect = vec2(ratio, 1.0);
  // Radius that just reaches the corner farthest from the centre.
  float reach = length(max(center, 1.0 - center) * aspect);
  float s = max(smoothness, 0.0001);
  float r = progress * (reach + s);
  float m = 1.0 - smoothstep(r - s, r, length((uv - center) * aspect));
  return mix(getFromColor(uv), getToColor(uv), m);
}`,
  ),

  fx(
    "clock-wipe",
    `// @name Clock Wipe
// @category Transitions
// @description A radial sweep, like a clock hand, reveals the next shot.
uniform vec2 center; // = vec2(0.5, 0.5)
uniform float smoothness; // = 0.02, min: 0, max: 0.2
uniform bool counterclockwise; // = false

vec4 transition(vec2 uv) {
  vec2 p = (uv - center) * vec2(ratio, 1.0);
  // Turns swept from 12 o'clock, 0..1.
  float turn = fract(atan(counterclockwise ? -p.x : p.x, p.y) / 6.2831853 + 1.0);
  float s = max(smoothness, 0.0001);
  float edge = progress * (1.0 + s);
  float m = 1.0 - smoothstep(edge - s, edge, turn);
  return mix(getFromColor(uv), getToColor(uv), m);
}`,
  ),

  fx(
    "diamond",
    `// @name Diamond
// @category Transitions
// @description A growing diamond reveals the next shot.
uniform vec2 center; // = vec2(0.5, 0.5)
uniform float smoothness; // = 0.05, min: 0, max: 0.5

vec4 transition(vec2 uv) {
  vec2 aspect = vec2(ratio, 1.0);
  // Manhattan distance, so the shape is a true diamond on screen.
  vec2 far = max(center, 1.0 - center) * aspect;
  float reach = far.x + far.y;
  vec2 d = abs(uv - center) * aspect;
  float s = max(smoothness, 0.0001);
  float r = progress * (reach + s);
  float m = 1.0 - smoothstep(r - s, r, d.x + d.y);
  return mix(getFromColor(uv), getToColor(uv), m);
}`,
  ),

  fx(
    "dissolve",
    `// @name Dissolve
// @category Transitions
// @description The next shot burns through in organic, grainy patches.
uniform float scale; // = 10, min: 1, max: 100, label: Pattern scale
uniform float grain; // = 0.35, min: 0, max: 1
uniform float smoothness; // = 0.1, min: 0, max: 0.5
${NOISE}
vec4 transition(vec2 uv) {
  vec2 p = uv * vec2(ratio, 1.0) * scale;
  // Two octaves of value noise, stretched to use the full 0..1 range, plus per-pixel grain.
  float n = valueNoise(p) * 0.65 + valueNoise(p * 2.7 + 13.1) * 0.35;
  n = mix(smoothstep(0.15, 0.85, n), hash12(floor(uv * resolution)), grain);
  float s = max(smoothness, 0.0001);
  float m = smoothstep(n, n + s, progress * (1.0 + s));
  return mix(getFromColor(uv), getToColor(uv), m);
}`,
  ),

  fx(
    "pixelate-transition",
    `// @name Pixelate
// @category Transitions
// @description Breaks into growing blocks, swaps shots, then sharpens again.
uniform float size; // = 48, min: 4, max: 200, label: Max cell size (px)

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  // Cells grow until the midpoint, then shrink back.
  float cellPx = max(1.0, floor(mix(1.0, size, 1.0 - abs(2.0 * t - 1.0))));
  vec2 cell = vec2(cellPx) / resolution;
  vec2 q = cellPx > 1.0 ? clamp((floor(uv / cell) + 0.5) * cell, 0.0, 1.0) : uv;
  return mix(getFromColor(q), getToColor(q), smoothstep(0.4, 0.6, t));
}`,
  ),

  fx(
    "whip",
    `// @name Whip Pan
// @category Transitions
// @description A fast camera whip with motion blur from one shot into the next.
uniform vec2 direction; // = vec2(1.0, 0.0)
uniform float blur; // = 0.6, min: 0, max: 1, label: Motion blur
${DIRECTION}${JITTER}
vec4 whipFrame(vec2 uv, vec2 d, float p) {
  vec2 fromUv = uv - d * p;
  if (insideFrame(fromUv)) return getFromColor(fromUv);
  vec2 toUv = fromUv + d;
  if (insideFrame(toUv)) return getToColor(toUv);
  return vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 transition(vec2 uv) {
  vec2 d = axisDirection(direction);
  float t = clamp(progress, 0.0, 1.0);
  // Strong ease in and out so the move whips through the middle.
  float p = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  // The virtual shutter spans more of the move while it is fastest.
  float spread = blur * 0.3 * sin(3.14159265 * t);
  float j = jitter(uv);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 24; i++) {
    float o = ((float(i) + j) / 24.0 - 0.5) * spread;
    acc += whipFrame(uv, d, clamp(p + o, 0.0, 1.0));
  }
  return acc / 24.0;
}`,
  ),

  fx(
    "glitch-transition",
    `// @name Glitch
// @category Transitions
// @description Cuts through digital corruption: blocks switch shots at random moments.
uniform float strength; // = 0.6, min: 0, max: 1
uniform float split; // = 20, min: 0, max: 80, label: RGB split (px)
${NOISE}
vec4 glitchMix(vec2 uv, float m) {
  vec2 q = vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0));
  return mix(getFromColor(q), getToColor(q), m);
}

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  float peak = sin(3.14159265 * t) * strength;
  float tick = floor(t * 24.0);
  // Each block switches to the incoming shot at its own moment around the middle.
  vec2 block = floor(uv * vec2(8.0, 14.0));
  float m = step(0.3 + 0.4 * hash12(block + 0.5), t);
  // Horizontal slices jump sideways; the slicing changes every tick.
  vec2 slice = floor(uv * vec2(4.0, 24.0 + floor(hash12(vec2(tick, 1.1)) * 24.0)));
  float shift = (hash12(slice + tick * 7.1) - 0.5) * 0.3 * peak * step(0.6, hash12(slice * 1.3 + tick));
  vec2 q = vec2(uv.x + shift, uv.y);
  vec2 off = vec2(split * peak / resolution.x, 0.0);
  vec4 r = glitchMix(q + off, m);
  vec4 g = glitchMix(q, m);
  vec4 b = glitchMix(q - off, m);
  return vec4(r.r, g.g, b.b, g.a);
}`,
  ),

  fx(
    "ripple-transition",
    `// @name Ripple
// @category Transitions
// @description Water rings spread from a point while the shots blend.
uniform float amplitude; // = 0.03, min: 0, max: 0.1
uniform float frequency; // = 24, min: 2, max: 80, label: Ring density
uniform float speed; // = 30, min: 0, max: 100
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  vec2 aspect = vec2(ratio, 1.0);
  vec2 d = (uv - center) * aspect;
  float r = length(d);
  vec2 dir = r > 0.00001 ? d / r : vec2(0.0);
  float wave = sin(r * frequency - t * speed);
  // Displacement peaks mid-transition and is zero at both ends.
  vec2 q = clamp(uv + dir * wave * amplitude * sin(3.14159265 * t) / aspect, 0.0, 1.0);
  return mix(getFromColor(q), getToColor(q), smoothstep(0.3, 0.7, t));
}`,
  ),

  fx(
    "swirl-transition",
    `// @name Swirl
// @category Transitions
// @description Twists the current shot into a vortex and unwinds into the next.
uniform float turns; // = 1, min: -4, max: 4
uniform float radius; // = 0.8, min: 0.1, max: 2
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  vec2 aspect = vec2(ratio, 1.0);
  vec2 p = (uv - center) * aspect;
  float falloff = max(1.0 - length(p) / radius, 0.0);
  // Twist peaks mid-transition and is zero at both ends.
  float a = 6.2831853 * turns * sin(3.14159265 * t) * falloff * falloff;
  float s = sin(a);
  float cs = cos(a);
  p = vec2(cs * p.x - s * p.y, s * p.x + cs * p.y);
  vec2 q = clamp(p / aspect + center, 0.0, 1.0);
  return mix(getFromColor(q), getToColor(q), smoothstep(0.35, 0.65, t));
}`,
  ),

  fx(
    "luma-wipe",
    `// @name Luma Wipe
// @category Transitions
// @description A gradient wipe that follows the brightness of the current shot.
uniform float angle; // = 45, min: -180, max: 180, label: Angle (degrees)
uniform float brightness; // = 0.6, min: 0, max: 1, label: Follow brightness
uniform float softness; // = 0.25, min: 0.01, max: 1
uniform bool invert; // = false, label: Dark areas first
${LUMA}
vec4 transition(vec2 uv) {
  vec4 from = getFromColor(uv);
  float a = radians(angle);
  vec2 dir = vec2(cos(a), sin(a));
  // Linear gradient along the angle, 0..1 across the frame.
  float gradient = dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5;
  // Bright areas go first unless inverted.
  float l = luma(from.rgb);
  float order = mix(gradient, invert ? l : 1.0 - l, brightness);
  float m = smoothstep(order, order + softness, progress * (1.0 + softness));
  return mix(from, getToColor(uv), m);
}`,
  ),

  fx(
    "doorway",
    `// @name Doorway
// @category Transitions
// @description The current shot opens like a pair of doors onto the next one.
uniform float depth; // = 0.4, min: 0, max: 1, label: Perspective

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  float p = t * t * (3.0 - 2.0 * t);
  float doorWidth = 0.5 * (1.0 - p);
  // Left door hinges on the left edge, right door on the right edge.
  float fromHinge = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
  if (fromHinge < doorWidth) {
    float u = fromHinge / doorWidth;
    // The free edge swings away from the viewer, so it looks shorter.
    float h = 1.0 - depth * p * u;
    float y = 0.5 + (uv.y - 0.5) / h;
    if (y >= 0.0 && y <= 1.0) {
      vec4 door = getFromColor(vec2(uv.x < 0.5 ? u * 0.5 : 1.0 - u * 0.5, y));
      return vec4(door.rgb * (1.0 - 0.5 * p * u), door.a);
    }
  }
  // The next shot approaches from behind the doors.
  vec2 q = 0.5 + (uv - 0.5) / mix(0.7, 1.0, p);
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);
  vec4 behind = getToColor(q);
  return vec4(behind.rgb * mix(0.4, 1.0, p), behind.a);
}`,
  ),

  fx(
    "cube",
    `// @name Cube
// @category Transitions
// @description Turns the frame like the faces of a rotating cube.
uniform float depth; // = 0.5, min: 0, max: 1, label: Perspective
uniform bool reverse; // = false, label: Turn the other way

vec4 transition(vec2 uv) {
  float t = clamp(progress, 0.0, 1.0);
  float p = t * t * (3.0 - 2.0 * t);
  // Work as if the cube always turns left; mirror x back when sampling.
  float x = reverse ? 1.0 - uv.x : uv.x;
  float seam = 1.0 - p;
  bool outgoing = x < seam;
  // u runs 0..1 across the visible face, from its outer edge to the shared seam.
  float u = outgoing ? x / max(seam, 0.0001) : 1.0 - (x - seam) / max(p, 0.0001);
  float turned = outgoing ? p : 1.0 - p;
  // Outer edges recede (shorter) and darken as the face turns away.
  float h = 1.0 - depth * turned * (1.0 - u);
  float y = 0.5 + (uv.y - 0.5) / h;
  if (y < 0.0 || y > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float sx = outgoing ? u : 1.0 - u;
  vec2 q = vec2(reverse ? 1.0 - sx : sx, y);
  vec4 face = outgoing ? getFromColor(q) : getToColor(q);
  return vec4(face.rgb * (1.0 - 0.6 * turned * (1.0 - u)), face.a);
}`,
  ),
];
