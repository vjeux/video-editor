import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, fonts, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  field: {
    height: 28,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingBlock: 0,
    paddingInline: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus-within": colors.accent },
    backgroundColor: colors.bg,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  prefix: { color: colors.faint },
});

/** A compact input box with a short prefix label, e.g. "X 120". */
export function Field({ prefix, children }: { prefix: string; children: ReactNode }) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.prefix)}>{prefix}</span>
      {children}
    </label>
  );
}
