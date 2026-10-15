import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const spin = stylex.keyframes({ to: { transform: "rotate(360deg)" } });

const styles = stylex.create({
  spinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.line2,
    borderTopColor: colors.accent2,
    animationName: spin,
    animationDuration: "0.8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

export function Spinner() {
  return <span role="progressbar" aria-label="Loading" {...stylex.props(styles.spinner)} />;
}
