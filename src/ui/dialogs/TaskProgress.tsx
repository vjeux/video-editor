import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  wrap: { display: "grid", gap: 6 },
  track: {
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: colors.line2,
  },
  bar: {
    height: "100%",
    backgroundImage: `linear-gradient(90deg, ${colors.accent}, ${colors.pink})`,
    transitionProperty: "width",
    transitionDuration: "0.15s",
  },
  width: (pct: string) => ({ width: pct }),
  hint: { color: colors.faint, fontSize: 11.5, lineHeight: 1.6 },
});

/** A labelled progress bar (0–1) with a line of status underneath. */
export function TaskProgress({
  label,
  progress,
  status,
}: {
  label: string;
  progress: number;
  status: string;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div {...stylex.props(styles.wrap)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        {...stylex.props(styles.track)}
      >
        <div {...stylex.props(styles.bar, styles.width(`${progress * 100}%`))} />
      </div>
      <span {...stylex.props(styles.hint)}>{status}</span>
    </div>
  );
}
