import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import type { TextClip, TextStyle } from "../../core/types";
import { colors, motion, radii } from "../theme/tokens.stylex";
import { CAPTION_PRESETS } from "./options";

const styles = stylex.create({
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 },
  preset: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    height: 38,
    paddingBlock: 0,
    paddingInline: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":hover": colors.line2 },
    backgroundColor: { default: colors.field, ":hover": colors.raised },
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: 500,
    textAlign: "start",
    cursor: "pointer",
    transition: `background-color ${motion.fast}, border-color ${motion.fast}`,
  },
  selected: {
    backgroundColor: { default: colors.accentSoft, ":hover": colors.accentSoft },
    borderColor: { default: colors.accentRing, ":hover": colors.accent },
    color: colors.text,
  },
  name: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  sample: {
    flexShrink: 0,
    width: 24,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 1,
  },
  look: (font: string, weight: number, color: string, shadow: string) => ({
    fontFamily: font,
    color,
    fontWeight: weight,
    textShadow: shadow,
  }),
  gradient: (from: string, to: string) => ({
    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
    backgroundClip: "text",
    color: "transparent",
  }),
});

/** One-click caption looks (bold Hormozi-style, highlight, gaming) for a title. */
export function CaptionPresets({ clip }: { clip: TextClip }) {
  return (
    <div {...stylex.props(styles.grid)}>
      {CAPTION_PRESETS.map((preset) => {
        const selected =
          clip.animation === "none" &&
          Object.entries(preset.style).every(
            ([key, value]) =>
              JSON.stringify(clip.style[key as keyof TextStyle]) === JSON.stringify(value),
          ) &&
          JSON.stringify(clip.textMotion) === JSON.stringify(preset.textMotion) &&
          JSON.stringify(clip.karaoke) === JSON.stringify(preset.karaoke);
        return (
          <button
            key={preset.name}
            type="button"
            title={`Apply the ${preset.name} caption look`}
            aria-label={preset.name}
            aria-pressed={selected}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") e.stopPropagation();
            }}
            onClick={() =>
              updateClip(clip.id, (c) =>
                c.type === "text"
                  ? {
                      ...c,
                      style: { ...c.style, ...preset.style },
                      animation: "none",
                      textMotion: preset.textMotion,
                      karaoke: preset.karaoke,
                    }
                  : c,
              )
            }
            {...stylex.props(styles.preset, selected && styles.selected)}
          >
            <span
              aria-hidden
              {...stylex.props(
                styles.sample,
                styles.look(
                  preset.style.fontFamily ?? "inherit",
                  preset.style.fontWeight ?? 700,
                  preset.karaoke?.color ?? preset.style.color ?? "#ffffff",
                  preset.style.glow ? `0 0 5px ${preset.style.glow.color}` : "none",
                ),
                preset.style.gradient &&
                  styles.gradient(preset.style.gradient.from, preset.style.gradient.to),
              )}
            >
              Aa
            </span>
            <span {...stylex.props(styles.name)}>{preset.name}</span>
          </button>
        );
      })}
    </div>
  );
}
