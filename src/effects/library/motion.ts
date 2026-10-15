import type { EffectDefinition } from "../../core/types";
import { NOISE, fx } from "./shared";

/** Smooth 1D value noise in -1..1 (needs NOISE). */
const NOISE_1D = `
float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f)) * 2.0 - 1.0;
}
`;

/** Scales the frame by `zoom` about `pivot` (uv), extending edge pixels. */
const ZOOM_ABOUT = `
vec4 zoomAbout(vec2 uv, vec2 pivot, float zoom) {
  return getColor(clamp(pivot + (uv - pivot) / zoom, 0.0, 1.0));
}
`;

export const MOTION_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "punch-zoom",
    `// @name Punch Zoom
// @category Motion
// @description Punches in to a tighter crop at the start of the clip: snap, bounce or a slow push.
uniform float amount; // = 1.2, min: 1, max: 2, label: Zoom
uniform float rampTime; // = 0.25, min: 0.05, max: 3, label: Ramp (seconds)
uniform int style; // = 0, min: 0, max: 2, label: Style (0 snap / 1 bounce / 2 slow push)
uniform vec2 center; // = vec2(0.5, 0.5)
${ZOOM_ABOUT}
float punchCurve() {
  // Slow push ignores the ramp and spans the whole clip.
  if (style == 2) return clamp(progress, 0.0, 1.0);
  float s = max(time, 0.0) / rampTime;
  // Damped spring: first reaches the zoom at s = 1, overshoots ~15%, settles by s ~ 5.
  if (style == 1) return 1.0 - exp(-0.95 * s) * cos(1.5707963 * min(s, 40.0));
  float x = clamp(s, 0.0, 1.0);
  return 1.0 - (1.0 - x) * (1.0 - x) * (1.0 - x);
}

vec4 effect(vec2 uv) {
  return zoomAbout(uv, center, max(mix(1.0, amount, punchCurve()), 0.01));
}`,
  ),

  fx(
    "zoom-pulse",
    `// @name Zoom Pulse
// @category Motion
// @description Kicks the zoom in on a steady beat and lets it decay, for music-synced edits.
uniform float amount; // = 1.08, min: 1, max: 1.5, label: Kick zoom
uniform float interval; // = 0.5, min: 0.1, max: 4, label: Interval (seconds)
uniform float decay; // = 6, min: 0.5, max: 30
uniform float offset; // = 0, min: 0, max: 4, label: Offset (seconds)
${ZOOM_ABOUT}
vec4 effect(vec2 uv) {
  float t = time - offset;
  // Seconds since the latest beat; no pulses before the offset.
  float kick = t < 0.0 ? 0.0 : exp(-decay * mod(t, interval));
  return zoomAbout(uv, vec2(0.5), 1.0 + (amount - 1.0) * kick);
}`,
  ),

  fx(
    "impact-shake",
    `// @name Impact Shake
// @category Motion
// @description A hard camera jolt at the start of the clip that dies away.
uniform float strength; // = 0.03, min: 0, max: 0.15
uniform float decay; // = 5, min: 0, max: 20
uniform float frequency; // = 18, min: 1, max: 40
uniform float rotation; // = 2, min: 0, max: 15, label: Rotation (degrees)
${NOISE}${NOISE_1D}
vec4 effect(vec2 uv) {
  float envelope = exp(-decay * max(time, 0.0));
  float t = mod(time, 500.0) * frequency;
  // Two octaves of noise per axis, roughly -1.5..1.5.
  vec2 jolt = vec2(noise1(t) + 0.5 * noise1(t * 2.3 + 11.0), noise1(t + 37.1) + 0.5 * noise1(t * 2.3 + 53.0));
  vec2 offset = jolt * strength * envelope;
  float maxAngle = radians(rotation) * envelope;
  float a = maxAngle * noise1(t + 71.3);
  // Zoom just enough that the moved, rotated frame still covers the output; relaxes as it decays.
  float zoom = (cos(maxAngle) + max(ratio, 1.0 / ratio) * sin(maxAngle)) / max(1.0 - 3.0 * strength * envelope, 0.5);
  vec2 p = (uv - 0.5) * vec2(ratio, 1.0) / zoom;
  float s = sin(a);
  float cs = cos(a);
  p = vec2(cs * p.x - s * p.y, s * p.x + cs * p.y);
  return getColor(clamp(p / vec2(ratio, 1.0) + 0.5 + offset, 0.0, 1.0));
}`,
  ),

  fx(
    "ken-burns",
    `// @name Ken Burns
// @category Motion
// @description A slow pan and zoom across the whole clip, for stills and B-roll.
uniform float startZoom; // = 1, min: 1, max: 2
uniform float endZoom; // = 1.15, min: 1, max: 2
uniform vec2 pan; // = vec2(0.05, 0.0)

vec4 effect(vec2 uv) {
  float p = clamp(progress, 0.0, 1.0);
  float zoom = max(mix(startZoom, endZoom, p), 1.0);
  // The view centre travels by pan over the clip, kept where the crop stays inside the image.
  float h = 0.5 / zoom;
  vec2 view = clamp(0.5 + pan * (p - 0.5), vec2(h), vec2(1.0 - h));
  return getColor(clamp(view + (uv - 0.5) / zoom, 0.0, 1.0));
}`,
  ),
];
