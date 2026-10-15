import * as stylex from "@stylexjs/stylex";
import { radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  banner: {
    position: "fixed",
    top: 56,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 80,
    paddingBlock: 8,
    paddingInline: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 93, 108, 0.4)",
    backgroundColor: "#3a1d22",
    color: "#ffc4ca",
    fontSize: 12.5,
  },
});

export function UnsupportedBanner() {
  return (
    <div role="alert" {...stylex.props(styles.banner)}>
      This browser lacks WebCodecs — use a recent Chrome, Edge, Safari or Firefox to decode and
      export video.
    </div>
  );
}
