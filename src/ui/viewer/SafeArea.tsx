import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  action: {
    position: "absolute",
    inset: "5%",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.18)",
    pointerEvents: "none",
    "::after": {
      content: '""',
      position: "absolute",
      inset: "5.5%",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
  },
});

/** Action-safe (outer) and title-safe (inner) guides. */
export function SafeArea() {
  return <div aria-hidden {...stylex.props(styles.action)} />;
}
