import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import type { TextClip } from "../../core/types";
import { colors, radii } from "../theme/tokens.stylex";
import { CAPTION_PRESETS } from "./options";

const styles = stylex.create({
  grid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 },
  preset: {
    height: 44,
    paddingBlock: 0,
    paddingInline: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":hover": colors.accent },
    backgroundImage: "linear-gradient(135deg, #2b1055, #7597de)",
    cursor: "pointer",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  look: (font: string, color: string, stroke: string) => ({
    fontFamily: font,
    color,
    fontWeight: 800,
    fontSize: 13,
    textShadow: `-1px -1px 0 ${stroke}, 1px -1px 0 ${stroke}, -1px 1px 0 ${stroke}, 1px 1px 0 ${stroke}`,
  }),
});

/** One-click caption looks (bold Hormozi-style, highlight, gaming) for a title. */
export function CaptionPresets({ clip }: { clip: TextClip }) {
  return (
    <div {...stylex.props(styles.grid)}>
      {CAPTION_PRESETS.map((preset) => (
        <button
          key={preset.name}
          type="button"
          title={`Apply the ${preset.name} caption look`}
          onClick={() =>
            updateClip(clip.id, (c) =>
              c.type === "text"
                ? { ...c, style: { ...c.style, ...preset.style }, animation: preset.animation }
                : c,
            )
          }
          {...stylex.props(
            styles.preset,
            styles.look(
              preset.style.fontFamily,
              preset.style.color,
              preset.style.stroke?.color ?? "transparent",
            ),
          )}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}
