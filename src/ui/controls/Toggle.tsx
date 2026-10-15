import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  track: {
    position: "relative",
    width: 28,
    height: 16,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.line2,
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  trackOn: { backgroundColor: colors.accent },
  knob: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: "50%",
    backgroundColor: "#fff",
    transition: "transform 0.15s",
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
