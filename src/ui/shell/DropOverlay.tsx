import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    pointerEvents: "none",
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(124, 108, 255, 0.08)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.accent,
    color: colors.accent2,
    fontSize: 16,
    fontWeight: 600,
  },
});

export function DropOverlay() {
  return <div {...stylex.props(styles.overlay)}>Drop to import into the media bin</div>;
}
