import type { EffectKind } from "../../core/types";

// GLSL ES only promises ASCII, so these templates avoid typographic characters.
const EFFECT = `// A Cutline effect runs once for every pixel of the clip.
//
// Parameters are uniforms. A comment after the declaration sets up its control:
//   uniform float amount; // = default, min: 0, max: 1, step: 0.01, label: Amount
// float and int become sliders, bool a toggle, vec2 a point and vec3 a colour.
//
// Provided by the editor:
//   vec4 getColor(vec2 uv)  the clip's pixel at uv (0..1, origin bottom-left)
//   float time              seconds since the clip started
//   float progress          0 -> 1 over the clip
//   float ratio             frame width / height
//   vec2 resolution         frame size in pixels

uniform float amount; // = 0.6, min: 0, max: 1, label: Amount
uniform vec3 tint; // = vec3(1.0, 0.62, 0.38), label: Tint
uniform float vignette; // = 0.45, min: 0, max: 1, label: Vignette

vec4 effect(vec2 uv) {
  vec4 color = getColor(uv);
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 graded = mix(color.rgb, luma * tint * 1.4, amount);

  // Distance from the centre, corrected for the frame's aspect ratio.
  vec2 p = (uv - 0.5) * vec2(ratio, 1.0);
  graded *= 1.0 - vignette * smoothstep(0.35, 0.95, length(p));

  return vec4(graded, color.a);
}
`;

const TRANSITION = `// A Cutline transition blends the outgoing clip into the incoming one.
// Shaders from gl-transitions.com work as they are.
//
// Parameters are uniforms. A comment after the declaration sets up its control:
//   uniform float softness; // = default, min: 0, max: 1, step: 0.01, label: Softness
// float and int become sliders, bool a toggle, vec2 a point and vec3 a colour.
//
// Provided by the editor:
//   vec4 getFromColor(vec2 uv)  the outgoing clip's pixel at uv
//   vec4 getToColor(vec2 uv)    the incoming clip's pixel at uv
//   float progress              0 at the start of the transition, 1 at the end
//   float time                  seconds since the incoming clip started
//   float ratio                 frame width / height
//   vec2 resolution             frame size in pixels

uniform float angle; // = 0, min: 0, max: 360, step: 1, label: Angle
uniform float softness; // = 0.12, min: 0, max: 0.5, label: Softness

vec4 transition(vec2 uv) {
  vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));
  // Position along the wipe direction, 0..1 across the frame.
  float along = dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5;
  float edge = mix(-softness, 1.0 + softness, progress);
  float showTo = 1.0 - smoothstep(edge - softness, edge + softness, along);
  return mix(getFromColor(uv), getToColor(uv), showTo);
}
`;

export const TEMPLATES: Record<EffectKind, string> = { effect: EFFECT, transition: TRANSITION };

export const DEFAULT_NAMES: Record<EffectKind, string> = {
  effect: "My effect",
  transition: "My transition",
};
