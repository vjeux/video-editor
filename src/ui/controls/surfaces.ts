import * as stylex from "@stylexjs/stylex";
import { colors, motion, radii, shadows, sizes } from "../theme/tokens.stylex";

/**
 * The two surfaces every control is built from, so inputs, triggers and
 * buttons share one look: recessed wells for values, raised plates for actions.
 */
export const surfaces = stylex.create({
  well: {
    height: sizes.control,
    minWidth: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.line,
      ":hover": colors.line2,
      ":focus-within": colors.accent,
    },
    backgroundColor: { default: colors.field, ":hover": colors.fieldHover },
    boxShadow: {
      default: shadows.well,
      ":focus-within": `${shadows.well}, ${shadows.ring}`,
    },
    color: colors.text,
    outline: "none",
    transitionProperty: "border-color, background-color, box-shadow",
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
  },
  raised: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.03)",
    backgroundColor: { default: colors.raised, ":hover:not(:disabled)": colors.raisedHover },
    boxShadow: shadows.raised,
    color: colors.text,
    transitionProperty: "background-color, box-shadow, transform, color",
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: { default: "none", ":active:not(:disabled)": "translateY(0.5px) scale(0.985)" },
  },
});
