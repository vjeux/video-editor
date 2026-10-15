import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  separator: {
    height: 1,
    marginBlock: 4,
    marginInline: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
});

export function MenuSeparator() {
  return <div role="separator" {...stylex.props(styles.separator)} />;
}
