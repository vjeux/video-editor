import * as stylex from "@stylexjs/stylex";
import { colors, motion, radii, shadows } from "../theme/tokens.stylex";

const styles = stylex.create({
  track: {
    position: "relative",
    flexShrink: 0,
    width: 30,
    height: 18,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.pill,
    backgroundColor: { default: colors.line2, ":hover": "#3c4250" },
    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.35)",
    cursor: "pointer",
    transitionProperty: "background-color, box-shadow",
    transitionDuration: motion.base,
    transitionTimingFunction: motion.ease,
  },
  trackOn: {
    backgroundColor: { default: colors.accent, ":hover": colors.accentHover },
    boxShadow: `inset 0 1px 2px rgba(0, 0, 0, 0.2), 0 0 10px ${colors.accentSoft}`,
  },
  knob: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    backgroundColor: "#fff",
    backgroundImage: "linear-gradient(180deg, #fff, #e9eaf0)",
    boxShadow: shadows.thumb,
    transitionProperty: "transform",
    transitionDuration: motion.base,
    transitionTimingFunction: motion.spring,
  },
  knobOn: { transform: "translateX(12px)" },
});

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      {...stylex.props(styles.track, on && styles.trackOn)}
    >
      <span {...stylex.props(styles.knob, on && styles.knobOn)} />
    </button>
  );
}
