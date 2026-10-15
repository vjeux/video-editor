import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import type { TextAnimation, TextClip } from "../../core/types";
import { colors, radii } from "../theme/tokens.stylex";
import { ANIMATIONS } from "./options";

const styles = stylex.create({
  grid: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 },
  tile: {
    position: "relative",
    aspectRatio: "1",
    padding: 0,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":hover": colors.line2 },
    backgroundImage: "linear-gradient(135deg, #2b1055, #7597de)",
    color: "#fff",
    cursor: "pointer",
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  plain: { backgroundImage: "none", backgroundColor: colors.panel2, color: colors.muted },
  on: {
    borderColor: { default: "transparent", ":hover": "transparent" },
    boxShadow: `inset 0 0 0 2px ${colors.accent}`,
  },
  preview: {
    display: "flex",
    alignItems: "center",
    marginBottom: 8,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1,
  },
  fade: { opacity: 0.45 },
  rise: { transform: "translateY(-3px)", textShadow: "0 5px 0 rgba(255, 255, 255, 0.22)" },
  blur: { filter: "blur(1.5px)" },
  ghost: { opacity: 0.3 },
  caret: {
    width: 1.5,
    height: 13,
    marginInlineStart: 1,
    borderRadius: 1,
    backgroundColor: colors.accent2,
  },
  label: {
    position: "absolute",
    insetInline: 0,
    bottom: 0,
    paddingBlock: 1,
    paddingInline: 0,
    fontSize: 9,
    fontWeight: 500,
    color: colors.text,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
});

const PREVIEW_STYLE = {
  none: null,
  fade: styles.fade,
  rise: styles.rise,
  type: null,
  blur: styles.blur,
} satisfies Record<TextAnimation, unknown>;

/** Tiles that pick a title's entrance animation, each previewing its effect on "Aa". */
export function AnimationPresets({ clip }: { clip: TextClip }) {
  const pick = (animation: TextAnimation) =>
    updateClip(clip.id, (c) => (c.type === "text" ? { ...c, animation } : c));
  return (
    <div role="radiogroup" aria-label="Animation" {...stylex.props(styles.grid)}>
      {ANIMATIONS.map((a) => {
        const on = clip.animation === a.value;
        return (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={a.label}
            onClick={() => pick(a.value)}
            {...stylex.props(styles.tile, a.value === "none" && styles.plain, on && styles.on)}
          >
            <span aria-hidden {...stylex.props(styles.preview, PREVIEW_STYLE[a.value])}>
              A<span {...stylex.props(a.value === "type" && styles.ghost)}>a</span>
              {a.value === "type" && <span {...stylex.props(styles.caret)} />}
            </span>
            <span aria-hidden {...stylex.props(styles.label)}>
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
