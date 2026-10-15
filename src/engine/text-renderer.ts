import { textAnimationState } from "../core/animation";
import {
  GLYPH_IDENTITY,
  karaokeAt,
  segmentText,
  type TextSegment,
  unitDelta,
} from "../core/text-motion";
import type { TextClip, TextUnit } from "../core/types";
import type { Ctx2D } from "./compositor";

const LINE_HEIGHT = 1.15;
const BOX_PADDING = 0.35;
const BOX_RADIUS = 0.18;
/** Extra scale on the word being "sung" in karaoke pop mode. */
const KARAOKE_POP = 0.14;
/** Width of the shine band as a fraction of the title width. */
const SHINE_WIDTH = 0.22;

export interface TextLayout {
  lines: string[];
  lineHeight: number;
  width: number;
  height: number;
  /** Inset from the box edge to the glyphs (background, highlight and outline room). */
  padding: number;
}

export const fontFor = (clip: TextClip) =>
  `${clip.style.fontWeight} ${clip.style.fontSize}px "${clip.style.fontFamily}", system-ui, sans-serif`;

function applyFont(ctx: Ctx2D, clip: TextClip) {
  ctx.font = fontFor(clip);
  ctx.letterSpacing = `${clip.style.letterSpacing}px`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
}

export function layoutText(ctx: Ctx2D, clip: TextClip): TextLayout {
  const { style } = clip;
  ctx.save();
  applyFont(ctx, clip);
  const lines = clip.text.split("\n");
  // Ink bounds can overhang the advance width (italics, heavy weights).
  const textWidth = Math.max(
    1,
    ...lines.map((line) => {
      const m = ctx.measureText(line);
      return Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    }),
  );
  ctx.restore();
  const boxPadding = Math.max(
    style.background ? style.fontSize * BOX_PADDING : 0,
    style.highlight ? style.fontSize * style.highlight.padding : 0,
  );
  // The outline extends past the glyphs; inset the text so boxes and bounds include it.
  const padding = boxPadding + (style.stroke?.width ?? 0);
  const lineHeight = style.fontSize * LINE_HEIGHT;
  return {
    lines,
    lineHeight,
    width: textWidth + padding * 2,
    height: lines.length * lineHeight + padding * 2,
    padding,
  };
}

/** The unit size titles are drawn in: as fine as any active feature needs. */
function unitFor(clip: TextClip): TextUnit {
  if (clip.textMotion) return clip.textMotion.unit;
  if (clip.karaoke || clip.style.highlight?.mode === "word") return "word";
  return "line";
}

interface PlacedUnit extends TextSegment {
  /** Unit centre and advance width in the title's local space. */
  cx: number;
  cy: number;
  width: number;
  lineStart: number;
  lineWidth: number;
  /** Offset of the unit's first character in the whole text (newlines count). */
  offset: number;
  /** Index of the word the unit belongs to (for karaoke). */
  word: number;
}

function placeUnits(ctx: Ctx2D, clip: TextClip, layout: TextLayout): PlacedUnit[] {
  const inner = layout.width / 2 - layout.padding;
  const words = segmentText(clip.text, "word");
  const lineOffsets = layout.lines.reduce<number[]>(
    (acc, line, i) => [...acc, (acc[i] ?? 0) + line.length + 1],
    [0],
  );
  const lineWidths = layout.lines.map((line) => ctx.measureText(line).width);
  const lineStarts = lineWidths.map(
    (w) => ({ left: -inner, center: -w / 2, right: inner - w })[clip.style.align],
  );
  return segmentText(clip.text, unitFor(clip)).map((segment) => {
    const line = layout.lines[segment.line] ?? "";
    const before = ctx.measureText(line.slice(0, segment.from)).width;
    const width = ctx.measureText(segment.text).width;
    const lineStart = lineStarts[segment.line] ?? 0;
    const word = words.findIndex(
      (w) => w.line === segment.line && segment.from >= w.from && segment.from < w.to,
    );
    return {
      ...segment,
      cx: lineStart + before + width / 2,
      cy: -layout.height / 2 + layout.padding + layout.lineHeight * (segment.line + 0.5),
      width,
      lineStart,
      lineWidth: lineWidths[segment.line] ?? 0,
      offset: (lineOffsets[segment.line] ?? 0) + segment.from,
      word: Math.max(0, word),
    };
  });
}

const roundBox = (ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
};

/**
 * Draws a title in its local space (origin at the title's centre). Each unit
 * — line, word or letter — is drawn with its own transform so per-unit
 * animation, karaoke and per-word highlights compose with every style.
 */
export function drawText(ctx: Ctx2D, clip: TextClip, t: number) {
  const { style } = clip;
  const fs = style.fontSize;
  const layout = layoutText(ctx, clip);
  const anim = textAnimationState(clip, t);
  const local = t - clip.start;

  ctx.globalAlpha *= anim.opacity;
  if (anim.blur > 0) ctx.filter = `blur(${anim.blur}px)`;
  ctx.translate(0, anim.offsetY);

  if (style.background) {
    ctx.fillStyle = style.background;
    roundBox(
      ctx,
      -layout.width / 2,
      -layout.height / 2,
      layout.width,
      layout.height,
      fs * BOX_RADIUS,
    );
  }

  applyFont(ctx, clip);
  const units = placeUnits(ctx, clip, layout);
  const pad = style.highlight ? fs * style.highlight.padding : 0;
  const boxHeight = layout.lineHeight * 0.92 + pad;

  if (style.highlight?.mode === "line") {
    ctx.fillStyle = style.highlight.color;
    const drawn = new Set<number>();
    for (const u of units) {
      if (drawn.has(u.line)) continue;
      drawn.add(u.line);
      roundBox(
        ctx,
        u.lineStart - pad,
        u.cy - boxHeight / 2,
        u.lineWidth + pad * 2,
        boxHeight,
        fs * BOX_RADIUS,
      );
    }
  }

  const karaoke = clip.karaoke ? karaokeAt(clip, t) : null;
  const left = -layout.width / 2;
  const blockWidth = layout.width;

  for (const unit of units) {
    // Legacy whole-title typewriter: reveal characters in order.
    const visible = Math.max(0, anim.visibleChars - unit.offset);
    const text = unit.text.slice(0, visible);
    if (!text) continue;

    const delta = clip.textMotion
      ? unitDelta(clip.textMotion, unit.index, units.length, local)
      : GLYPH_IDENTITY;
    if (delta.opacity <= 0) continue;
    const sung = karaoke !== null && unit.word <= karaoke.index;
    const current = karaoke !== null && unit.word === karaoke.index;
    const pop =
      current && clip.karaoke?.mode === "pop"
        ? 1 + KARAOKE_POP * Math.sin(Math.PI * Math.min(1, karaoke.fraction * 3))
        : 1;

    ctx.save();
    ctx.translate(unit.cx + delta.dx * fs, unit.cy + delta.dy * fs);
    ctx.rotate((delta.rotation * Math.PI) / 180);
    ctx.scale(delta.scale * pop, delta.scale * pop);
    ctx.globalAlpha *= delta.opacity;
    const x = -unit.width / 2;

    // 1. Boxes behind the glyphs: per-word highlight, or the karaoke box on the current word.
    const box = style.highlight?.mode === "word" ? style.highlight.color : null;
    const karaokeBox = current && clip.karaoke?.mode === "box" ? clip.karaoke.color : null;
    for (const color of [box, karaokeBox]) {
      if (!color) continue;
      ctx.fillStyle = color;
      const p = pad || fs * 0.12;
      roundBox(ctx, x - p, -boxHeight / 2, unit.width + p * 2, boxHeight, fs * BOX_RADIUS);
    }

    const fillStyle = (() => {
      if (sung && clip.karaoke?.mode !== "box") return clip.karaoke?.color ?? style.color;
      if (!style.gradient) return style.color;
      // One gradient across the whole title, expressed in this unit's space.
      const angle = (style.gradient.angle * Math.PI) / 180;
      const half = blockWidth / 2;
      const ox = -unit.cx;
      const oy = -unit.cy;
      const gradient = ctx.createLinearGradient(
        ox - Math.cos(angle) * half,
        oy - Math.sin(angle) * half,
        ox + Math.cos(angle) * half,
        oy + Math.sin(angle) * half,
      );
      gradient.addColorStop(0, style.gradient.from);
      gradient.addColorStop(1, style.gradient.to);
      return gradient;
    })();

    // 2. Neon glow: coloured blur around the glyphs, layered for intensity.
    if (style.glow) {
      ctx.save();
      ctx.shadowColor = style.glow.color;
      ctx.fillStyle = style.glow.color;
      for (const scale of [1, 0.45]) {
        ctx.shadowBlur = fs * style.glow.size * scale;
        ctx.fillText(text, x, 0);
      }
      ctx.restore();
    }

    // 3. Outline (carrying the drop shadow when present, so it sits behind the whole shape).
    const shadow = style.shadow;
    const applyShadow = () => {
      if (!shadow) return;
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = fs * shadow.blur;
      ctx.shadowOffsetX = fs * shadow.x;
      ctx.shadowOffsetY = fs * shadow.y;
    };
    if (style.stroke) {
      ctx.save();
      applyShadow();
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      // Twice the width so the fill covers its inner half.
      ctx.lineWidth = style.stroke.width * 2;
      ctx.strokeStyle = style.stroke.color;
      ctx.strokeText(text, x, 0);
      ctx.restore();
    }

    // 4. Fill.
    ctx.save();
    if (!style.stroke) applyShadow();
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, 0);
    ctx.restore();

    // 5. Shine: a light band sweeping across the title, painted only on the glyphs.
    if (style.shine && style.shine.period > 0) {
      const phase = (local % style.shine.period) / style.shine.period;
      const band = blockWidth * SHINE_WIDTH;
      const centre = left - band + phase * (blockWidth + band * 2) - unit.cx;
      const shine = ctx.createLinearGradient(centre - band, -fs * 0.3, centre + band, fs * 0.3);
      shine.addColorStop(0, "rgba(255, 255, 255, 0)");
      shine.addColorStop(0.5, style.shine.color);
      shine.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shine;
      ctx.fillText(text, x, 0);
    }
    ctx.restore();
  }
}
