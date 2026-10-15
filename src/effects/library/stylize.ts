import type { EffectDefinition } from "../../core/types";
import { JITTER, LUMA, NOISE, PREMUL, SOBEL, fx } from "./shared";

export const STYLIZE_EFFECTS: readonly EffectDefinition[] = [
  fx(
    "vignette",
    `// @name Vignette
// @category Stylize
// @description Darkens (or tints) the edges of the frame to draw the eye inward.
uniform float amount; // = 0.5, min: 0, max: 1
uniform float size; // = 0.75, min: 0, max: 1.5
uniform float softness; // = 0.6, min: 0.01, max: 1.5
uniform float roundness; // = 0, min: 0, max: 1
uniform vec3 color; // = vec3(0.0, 0.0, 0.0)

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Roundness 0 follows the frame's shape; 1 is a true circle.
  vec2 p = (uv - 0.5) * 2.0 * vec2(mix(1.0, ratio, roundness), 1.0);
  float v = smoothstep(size, size + softness, length(p));
  return vec4(mix(c.rgb, color, v * amount), c.a);
}`,
  ),

  fx(
    "film-grain",
    `// @name Film Grain
// @category Stylize
// @description Animated photographic grain, strongest in the midtones.
uniform float amount; // = 0.08, min: 0, max: 1
uniform float size; // = 1.5, min: 1, max: 6, label: Grain size (px)
uniform float chroma; // = 0.1, min: 0, max: 1, label: Color grain
${NOISE}${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // A new grain pattern 24 times a second, like film frames.
  float frame = floor(time * 24.0);
  vec2 cell = uv * resolution / size + vec2(mod(frame, 61.0) * 17.13, mod(frame, 53.0) * 3.71);
  float mono = valueNoise(cell) - 0.5;
  vec3 tinted = vec3(valueNoise(cell + 31.7), valueNoise(cell + 63.1), valueNoise(cell + 97.3)) - 0.5;
  vec3 grain = mix(vec3(mono), tinted, chroma);
  float l = luma(c.rgb);
  float midtones = 1.0 - (l * 2.0 - 1.0) * (l * 2.0 - 1.0);
  vec3 rgb = c.rgb + grain * amount * 2.0 * (0.4 + 0.6 * midtones);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "chromatic-aberration",
    `// @name Chromatic Aberration
// @category Stylize
// @description Splits the red and blue channels apart, like a cheap lens.
uniform float amount; // = 4, min: 0, max: 40, label: Offset (px)
uniform bool radial; // = true, label: Radial (stronger at the edges)
uniform float angle; // = 0, min: -180, max: 180, label: Angle (degrees)

vec4 effect(vec2 uv) {
  float a = radians(angle);
  // Radial: outward from the centre, reaching the full offset at the corners.
  vec2 dir = radial ? (uv - 0.5) * 1.4142 : vec2(cos(a), sin(a));
  vec2 off = dir * amount / resolution;
  vec4 r = getColor(clamp(uv + off, 0.0, 1.0));
  vec4 g = getColor(uv);
  vec4 b = getColor(clamp(uv - off, 0.0, 1.0));
  float alpha = max(g.a, max(r.a, b.a));
  vec3 premul = vec3(r.r * r.a, g.g * g.a, b.b * b.a);
  return vec4(alpha > 0.0001 ? clamp(premul / alpha, 0.0, 1.0) : vec3(0.0), alpha);
}`,
  ),

  fx(
    "glow",
    `// @name Glow
// @category Stylize
// @description Blooms the highlights into a soft halo.
uniform float threshold; // = 0.7, min: 0, max: 1
uniform float intensity; // = 0.6, min: 0, max: 3
uniform float radius; // = 16, min: 1, max: 64, label: Radius (px)
uniform vec3 tint; // = vec3(1.0, 1.0, 1.0)
${LUMA}${JITTER}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float spin = 6.2831853 * jitter(uv);
  vec2 extent = vec2(radius) / resolution;
  vec3 glow = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 48; i++) {
    float f = (float(i) + 0.5) / 48.0;
    float a = float(i) * 2.3999632 + spin;
    vec4 s = getColor(clamp(uv + vec2(cos(a), sin(a)) * sqrt(f) * extent, 0.0, 1.0));
    // Only highlights above the threshold bloom, with a soft knee.
    float knee = smoothstep(threshold, threshold + 0.25, luma(s.rgb));
    float w = exp(-3.0 * f);
    glow += s.rgb * s.a * knee * w;
    total += w;
  }
  glow *= intensity * tint / total;
  // Add in premultiplied space so the halo also spills onto transparent areas.
  vec3 premul = c.rgb * c.a + glow;
  float alpha = c.a + (1.0 - c.a) * clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0);
  return vec4(alpha > 0.0001 ? clamp(premul / alpha, 0.0, 1.0) : vec3(0.0), alpha);
}`,
  ),

  fx(
    "pixelate",
    `// @name Pixelate
// @category Stylize
// @description Turns the image into large square blocks.
uniform float size; // = 16, min: 1, max: 200, label: Cell size (px)
${PREMUL}
vec4 effect(vec2 uv) {
  if (size <= 1.0) return getColor(uv);
  vec2 cell = vec2(size) / resolution;
  vec2 base = floor(uv / cell) * cell;
  // Four taps per cell so thin details don't vanish or flicker.
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i % 2), float(i / 2)) * 0.5 + 0.25;
    acc += premultiply(getColor(clamp(base + o * cell, 0.0, 1.0)));
  }
  return unpremultiply(acc * 0.25);
}`,
  ),

  fx(
    "halftone",
    `// @name Halftone
// @category Stylize
// @description Print-style CMYK dot screens.
uniform float size; // = 8, min: 3, max: 48, label: Dot spacing (px)
uniform float angle; // = 0, min: -90, max: 90, label: Screen angle (degrees)
uniform vec3 paper; // = vec3(1.0, 0.98, 0.94)
uniform float amount; // = 1, min: 0, max: 1

vec4 halftoneCmyk(vec3 c) {
  float k = 1.0 - max(c.r, max(c.g, c.b));
  return vec4((1.0 - c - k) / max(1.0 - k, 0.0001), k);
}

// Ink coverage of one screen: the dot grid is rotated, and each dot's area is
// proportional to the ink at its cell centre.
float halftoneScreen(vec2 uv, float screenAngle, vec4 channel) {
  float a = radians(screenAngle + angle);
  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 p = rot * (uv * resolution);
  vec2 cellCenter = (floor(p / size) + 0.5) * size;
  vec4 s = getColor(clamp((transpose(rot) * cellCenter) / resolution, 0.0, 1.0));
  float ink = dot(halftoneCmyk(s.rgb), channel) * s.a;
  // At full ink the radius exceeds half the diagonal, so neighbouring dots merge.
  float r = sqrt(ink) * size * 0.75;
  float dotMask = clamp(r - length(p - cellCenter) + 0.5, 0.0, 1.0);
  return dotMask * min(ink * 20.0, 1.0);
}

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float cyan = halftoneScreen(uv, 15.0, vec4(1.0, 0.0, 0.0, 0.0));
  float magenta = halftoneScreen(uv, 75.0, vec4(0.0, 1.0, 0.0, 0.0));
  float yellow = halftoneScreen(uv, 0.0, vec4(0.0, 0.0, 1.0, 0.0));
  float black = halftoneScreen(uv, 45.0, vec4(0.0, 0.0, 0.0, 1.0));
  // Inks subtract from the paper.
  vec3 printed = paper * (1.0 - vec3(cyan, magenta, yellow)) * (1.0 - black);
  return vec4(mix(c.rgb, printed, amount), c.a);
}`,
  ),

  fx(
    "edge-detect",
    `// @name Edge Detect
// @category Stylize
// @description Traces the outlines in the image (Sobel filter).
uniform float strength; // = 1.5, min: 0, max: 5
uniform float thickness; // = 1, min: 0.5, max: 4, label: Thickness (px)
uniform float blend; // = 0, min: 0, max: 1, label: Show original
uniform bool invert; // = false, label: Dark lines on white
${LUMA}${SOBEL}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float e = clamp(sobel(uv, vec2(thickness) / resolution) * strength, 0.0, 1.0);
  vec3 background = invert ? vec3(1.0) : vec3(0.0);
  vec3 lineColor = invert ? vec3(0.0) : vec3(1.0);
  vec3 rgb = mix(mix(background, c.rgb, blend), lineColor, e);
  // Outlines of transparent layers stay visible.
  return vec4(rgb, max(c.a, e));
}`,
  ),

  fx(
    "emboss",
    `// @name Emboss
// @category Stylize
// @description Presses the image into relief, lit from one side.
uniform float strength; // = 2, min: 0, max: 8
uniform float angle; // = 135, min: -180, max: 180, label: Light angle (degrees)
uniform float depth; // = 1.5, min: 0.5, max: 6, label: Depth (px)
uniform float keepColor; // = 0, min: 0, max: 1, label: Keep color
${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float a = radians(angle);
  vec2 d = vec2(cos(a), sin(a)) * depth / resolution;
  vec4 toward = getColor(clamp(uv + d, 0.0, 1.0));
  vec4 away = getColor(clamp(uv - d, 0.0, 1.0));
  // Edges facing the light (bright behind, dark in front) come out lit.
  float relief = (luma(away.rgb) * away.a - luma(toward.rgb) * toward.a) * strength;
  vec3 rgb = mix(vec3(0.5 + relief), c.rgb + relief, keepColor);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "toon",
    `// @name Toon
// @category Stylize
// @description Flat cartoon shading with inked outlines.
uniform int levels; // = 5, min: 2, max: 12, label: Shading levels
uniform float outline; // = 0.25, min: 0.02, max: 1, label: Outline threshold
uniform float thickness; // = 1, min: 0.5, max: 4, label: Outline width (px)
uniform vec3 ink; // = vec3(0.05, 0.04, 0.08), label: Outline color
uniform float saturation; // = 0.3, min: 0, max: 1, label: Saturation boost
${LUMA}${SOBEL}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Quantise brightness but keep hue: scale the colour to its stepped peak.
  float n = float(levels);
  float peak = max(c.r, max(c.g, c.b));
  float stepped = ceil(peak * n - 0.25) / n;
  vec3 rgb = peak > 0.0001 ? c.rgb * (stepped / peak) : vec3(0.0);
  rgb = mix(vec3(luma(rgb)), rgb, 1.0 + saturation);
  float e = sobel(uv, vec2(thickness) / resolution);
  float lines = smoothstep(outline, outline * 1.5, e);
  rgb = mix(rgb, ink, lines);
  return vec4(clamp(rgb, 0.0, 1.0), max(c.a, lines));
}`,
  ),

  fx(
    "crt",
    `// @name CRT
// @category Stylize
// @description Curved tube with scanlines, a phosphor mask and gentle flicker.
uniform float curvature; // = 0.12, min: 0, max: 0.5
uniform float scanlines; // = 0.35, min: 0, max: 1
uniform float lineSize; // = 3, min: 1, max: 12, label: Line spacing (px)
uniform float phosphor; // = 0.2, min: 0, max: 1, label: Phosphor mask
uniform float vignette; // = 0.3, min: 0, max: 1

vec4 effect(vec2 uv) {
  // Barrel warp: the further from the centre, the further out we sample.
  vec2 p = uv * 2.0 - 1.0;
  p *= 1.0 + curvature * (p.yx * p.yx);
  vec2 q = p * 0.5 + 0.5;
  vec4 c = getColor(clamp(q, 0.0, 1.0));
  // Fades to black within one pixel of the curved border (antialiased).
  vec2 edge = min(q, 1.0 - q) * resolution;
  float inside = clamp(min(edge.x, edge.y), 0.0, 1.0);
  // Scanlines darken between lines, less on bright pixels (the beam blooms).
  float line = 0.5 + 0.5 * cos(6.2831853 * q.y * resolution.y / lineSize);
  float bright = max(c.r, max(c.g, c.b));
  vec3 rgb = c.rgb * (1.0 - scanlines * (1.0 - line) * (1.0 - 0.5 * bright));
  // Aperture grille: each pixel column favours one channel; mean gain stays 1.
  float column = mod(floor(uv.x * resolution.x), 3.0);
  vec3 stripe = vec3(step(column, 0.5), step(abs(column - 1.0), 0.5), step(1.5, column));
  rgb *= mix(vec3(1.0), stripe * 2.0 + 0.3333, phosphor);
  float v = 16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y);
  rgb *= mix(1.0, pow(clamp(v, 0.0, 1.0), 0.25), vignette);
  rgb *= 1.0 + 0.015 * sin(time * 110.0);
  return vec4(clamp(rgb * inside, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "vhs",
    `// @name VHS
// @category Stylize
// @description Worn videotape: wobbling lines, smeared colour and rolling tracking noise.
uniform float amount; // = 0.7, min: 0, max: 1
uniform float bleed; // = 6, min: 0, max: 24, label: Color bleed (px)
uniform float snow; // = 0.25, min: 0, max: 1, label: Noise
uniform float tracking; // = 0.5, min: 0, max: 1
${NOISE}
vec3 vhsToYiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523, 0.312))
  );
}

vec3 vhsToRgb(vec3 c) {
  return vec3(
    dot(c, vec3(1.0, 0.956, 0.621)),
    dot(c, vec3(1.0, -0.272, -0.647)),
    dot(c, vec3(1.0, -1.106, 1.703))
  );
}

vec4 effect(vec2 uv) {
  float frame = mod(floor(time * 30.0), 251.0);
  float row = floor(uv.y * resolution.y * 0.5);
  // Every line wobbles a little; a tracking band rolls slowly down the frame.
  float wobble = (hash12(vec2(row, frame)) - 0.5) * 0.002 + sin(uv.y * 40.0 + time * 3.0) * 0.0008;
  float band = 1.0 - smoothstep(0.0, 0.05, abs(uv.y - (1.0 - fract(time * 0.07))));
  float tear = band * tracking * (hash12(vec2(row * 1.7, frame + 3.0)) - 0.3) * 0.03;
  vec2 p = vec2(uv.x + (wobble + tear) * amount, uv.y);
  vec4 c = getColor(clamp(p, 0.0, 1.0));
  vec3 yiq = vhsToYiq(c.rgb);
  // Luma stays sharp; chroma is smeared horizontally and trails to the right.
  float stride = bleed * amount / resolution.x;
  vec2 chroma = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    float o = (float(i) - 5.0) * stride * 0.5;
    chroma += vhsToYiq(getColor(clamp(p + vec2(o, 0.0), 0.0, 1.0)).rgb).yz;
  }
  yiq.yz = mix(yiq.yz, chroma / 8.0, amount) * (1.0 - 0.15 * amount);
  float grain = hash12(floor(uv * resolution / 2.0) + vec2(frame * 13.0, 0.0)) - 0.5;
  float streaks = band * tracking * step(0.75, hash12(vec2(floor(uv.x * resolution.x / 3.0), row + frame)));
  yiq.x += (grain * snow * 0.3 + streaks * 0.5) * amount;
  vec3 rgb = vhsToRgb(yiq);
  // Tape never quite reaches black or white.
  rgb = mix(rgb, rgb * 0.92 + 0.04, amount);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "glitch",
    `// @name Glitch
// @category Stylize
// @description Digital corruption in bursts: displaced blocks, tears and split colour channels.
uniform float amount; // = 0.6, min: 0, max: 1
uniform float speed; // = 10, min: 1, max: 30, label: Glitches per second
uniform float split; // = 10, min: 0, max: 60, label: RGB split (px)
uniform float blocks; // = 0.5, min: 0, max: 1, label: Block displacement
${NOISE}
vec4 effect(vec2 uv) {
  float tick = mod(floor(time * speed), 997.0);
  // Some ticks are calm, others burst.
  float burst = smoothstep(0.35, 0.9, hash12(vec2(tick, 7.31))) * amount;
  // A grid of random proportions, re-rolled every tick.
  vec2 grid = vec2(4.0 + floor(hash12(vec2(tick, 1.3)) * 10.0), 8.0 + floor(hash12(vec2(tick, 2.9)) * 24.0));
  vec2 block = floor(uv * grid);
  float pick = hash12(block + tick * 13.7);
  float shift = (hash12(block * 1.7 + tick) - 0.5) * 0.25 * blocks * burst * step(1.0 - 0.3 * burst, pick);
  vec2 p = vec2(uv.x + shift, uv.y);
  // Thin horizontal tears.
  float tearRow = floor(uv.y * resolution.y / 3.0);
  p.x += (hash12(vec2(tearRow, tick)) - 0.5) * 0.02 * burst * step(0.97, hash12(vec2(tearRow * 0.3, tick + 5.0)));
  vec2 off = vec2(split * burst / resolution.x, 0.0) * (hash12(vec2(tick, 4.4)) > 0.5 ? 1.0 : -1.0);
  vec4 r = getColor(clamp(p + off, 0.0, 1.0));
  vec4 g = getColor(clamp(p, 0.0, 1.0));
  vec4 b = getColor(clamp(p - off, 0.0, 1.0));
  float alpha = max(g.a, max(r.a, b.a));
  vec3 rgb = alpha > 0.0001 ? vec3(r.r * r.a, g.g * g.a, b.b * b.a) / alpha : vec3(0.0);
  // The odd corrupted block flips to its negative.
  if (pick > 1.0 - 0.04 * burst) rgb = 1.0 - rgb;
  return vec4(clamp(rgb, 0.0, 1.0), alpha);
}`,
  ),

  fx(
    "old-film",
    `// @name Old Film
// @category Stylize
// @description Sepia projector footage with flicker, scratches, dust and gate weave.
uniform float amount; // = 0.8, min: 0, max: 1, label: Sepia
uniform float flicker; // = 0.15, min: 0, max: 0.5
uniform float scratches; // = 0.5, min: 0, max: 1
uniform float dust; // = 0.4, min: 0, max: 1
uniform float grain; // = 0.12, min: 0, max: 0.5
uniform float vignette; // = 0.5, min: 0, max: 1
${NOISE}${LUMA}
vec4 effect(vec2 uv) {
  float frame = mod(floor(time * 18.0), 211.0);
  // Gate weave: the whole picture drifts slightly every frame.
  vec2 p = uv + (vec2(hash11(frame), hash11(frame + 9.1)) - 0.5) * vec2(0.0015, 0.003);
  vec4 c = getColor(clamp(p, 0.0, 1.0));
  vec3 sepia = luma(c.rgb) * vec3(1.07, 0.89, 0.66) + vec3(0.04, 0.03, 0.0);
  vec3 rgb = mix(c.rgb, sepia, amount);
  rgb *= 1.0 + (hash11(frame * 1.37 + 4.0) - 0.5) * flicker;
  rgb += (hash12(floor(uv * resolution / 1.5) + frame * 7.0) - 0.5) * grain;
  // Up to three thin vertical scratches; each holds its place for a while and jitters.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float on = step(1.0 - scratches * 0.6, hash11(frame + fi * 31.0));
    float x = hash11(fi * 7.3 + floor(time * 0.5) * 3.1) + 0.002 * sin(time * 3.0 + fi * 2.0);
    float d = abs(uv.x - x) * resolution.x;
    float scratch = on * (1.0 - smoothstep(0.5, 1.5, d));
    scratch *= step(0.25, valueNoise(vec2(fi * 10.0, uv.y * 6.0 + frame)));
    rgb = mix(rgb, vec3(0.92, 0.9, 0.85), scratch * 0.6);
  }
  // Dust: at most one speck per cell, re-rolled every frame.
  vec2 dp = uv * vec2(ratio, 1.0) * 14.0;
  vec2 cellId = floor(dp);
  float present = step(1.0 - dust * 0.15, hash12(cellId + frame * 3.1));
  vec2 speckCenter = cellId + vec2(hash12(cellId + frame), hash12(cellId + frame + 5.0));
  float speckSize = 0.04 + 0.08 * hash12(cellId - frame);
  float speck = present * (1.0 - smoothstep(speckSize * 0.6, speckSize, length(dp - speckCenter)));
  rgb = mix(rgb, vec3(0.05), speck * 0.85);
  rgb *= 1.0 - vignette * smoothstep(0.35, 1.2, length((uv - 0.5) * 2.0));
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "night-vision",
    `// @name Night Vision
// @category Stylize
// @description Amplified green image intensifier with noise and a round eyepiece.
uniform float gain; // = 1.5, min: 1, max: 6, label: Amplification
uniform float snow; // = 0.25, min: 0, max: 1, label: Noise
uniform float scope; // = 0.6, min: 0, max: 1, label: Eyepiece
uniform vec3 tint; // = vec3(0.25, 1.0, 0.35)
${NOISE}${LUMA}
vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  float frame = mod(floor(time * 30.0), 241.0);
  float l = luma(c.rgb) * gain;
  l += (hash12(floor(uv * resolution / 1.5) + frame * 11.0) - 0.5) * snow * 0.5;
  // Faint raster of the intensifier tube.
  l *= 0.92 + 0.08 * sin(uv.y * resolution.y * 1.5);
  // Highlights burn toward white.
  vec3 rgb = tint * l + vec3(max(l - 1.0, 0.0));
  // Round eyepiece, corrected for aspect.
  float d = length((uv - 0.5) * vec2(ratio, 1.0));
  rgb *= 1.0 - scope * smoothstep(0.35, 0.5, d);
  return vec4(clamp(rgb, 0.0, 1.0), c.a);
}`,
  ),

  fx(
    "thermal",
    `// @name Thermal
// @category Stylize
// @description False-colour heat camera palette mapped from brightness.
uniform float amount; // = 1, min: 0, max: 1
uniform float shift; // = 0, min: -0.5, max: 0.5, label: Temperature offset
${LUMA}
vec3 thermalRamp(float t) {
  vec3 c = mix(vec3(0.0, 0.0, 0.12), vec3(0.15, 0.0, 0.6), smoothstep(0.0, 0.2, t));
  c = mix(c, vec3(0.7, 0.0, 0.6), smoothstep(0.2, 0.4, t));
  c = mix(c, vec3(1.0, 0.25, 0.0), smoothstep(0.4, 0.6, t));
  c = mix(c, vec3(1.0, 0.85, 0.0), smoothstep(0.6, 0.8, t));
  return mix(c, vec3(1.0), smoothstep(0.8, 1.0, t));
}

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  vec3 heat = thermalRamp(clamp(luma(c.rgb) + shift, 0.0, 1.0));
  return vec4(mix(c.rgb, heat, amount), c.a);
}`,
  ),

  fx(
    "kaleidoscope",
    `// @name Kaleidoscope
// @category Stylize
// @description Mirrors a wedge of the image around a centre into repeating segments.
uniform int segments; // = 6, min: 2, max: 24
uniform float angle; // = 0, min: -180, max: 180, label: Rotation (degrees)
uniform float spin; // = 0, min: -90, max: 90, label: Spin (degrees per second)
uniform float zoom; // = 1, min: 0.25, max: 4
uniform vec2 center; // = vec2(0.5, 0.5)

vec4 effect(vec2 uv) {
  vec2 p = (uv - center) * vec2(ratio, 1.0);
  float r = length(p) / zoom;
  float a = atan(p.y, p.x) + radians(angle + spin * time);
  float wedge = 6.2831853 / float(segments);
  // Fold the angle into half a wedge; mirroring alternate wedges hides the seams.
  a = abs(mod(a, wedge) - wedge * 0.5);
  vec2 q = vec2(cos(a), sin(a)) * r / vec2(ratio, 1.0) + center;
  // Mirror-repeat so the pattern never runs off the image.
  q = 1.0 - abs(1.0 - mod(q, 2.0));
  return getColor(q);
}`,
  ),

  fx(
    "letterbox",
    `// @name Letterbox
// @category Stylize
// @description Cinematic bars that crop the frame to a wider (or narrower) aspect ratio.
uniform float aspect; // = 2.39, min: 0.5, max: 3.5, label: Aspect ratio
uniform vec3 color; // = vec3(0.0, 0.0, 0.0), label: Bar color
uniform float softness; // = 0, min: 0, max: 0.05

vec4 effect(vec2 uv) {
  vec4 c = getColor(uv);
  // Visible fraction of the frame: letterbox if wider than the frame, else pillarbox.
  vec2 visible = aspect > ratio ? vec2(1.0, ratio / aspect) : vec2(aspect / ratio, 1.0);
  vec2 d = abs(uv - 0.5) - visible * 0.5;
  float bar = smoothstep(0.0, max(softness, 0.0005), max(d.x, d.y));
  return vec4(mix(c.rgb, color, bar), mix(c.a, 1.0, bar));
}`,
  ),

  fx(
    "dither",
    `// @name Dither
// @category Stylize
// @description Retro ordered (Bayer) dithering to a few colour levels.
uniform int levels; // = 3, min: 2, max: 16, label: Levels per channel
uniform float scale; // = 2, min: 1, max: 8, label: Pixel size
uniform bool monochrome; // = false
uniform vec3 dark; // = vec3(0.08, 0.07, 0.12), label: Monochrome dark
uniform vec3 light; // = vec3(0.95, 0.93, 0.85), label: Monochrome light
${LUMA}
// Bayer matrices built recursively; thresholds in 0..1.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

float bayer8(vec2 a) {
  return bayer4(0.5 * a) * 0.25 + bayer2(a);
}

vec4 effect(vec2 uv) {
  vec2 cell = floor(uv * resolution / scale);
  vec4 c = getColor(clamp((cell + 0.5) * scale / resolution, 0.0, 1.0));
  float threshold = bayer8(cell);
  float n = max(float(levels - 1), 1.0);
  if (monochrome) {
    float v = floor(luma(c.rgb) * n + threshold) / n;
    return vec4(mix(dark, light, clamp(v, 0.0, 1.0)), c.a);
  }
  return vec4(clamp(floor(c.rgb * n + threshold) / n, 0.0, 1.0), c.a);
}`,
  ),
];
