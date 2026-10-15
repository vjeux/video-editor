import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";
import { surfaces } from "./surfaces";

const styles = stylex.create({
  field: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingBlock: 0,
    paddingInline: 8,
  },
  prefix: { color: colors.faint, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em" },
});

/** A compact input box with a short prefix label, e.g. "X 120". */
export function Field({ prefix, children }: { prefix: string; children: ReactNode }) {
  return (
    <label {...stylex.props(surfaces.well, styles.field)}>
      <span {...stylex.props(styles.prefix)}>{prefix}</span>
      {children}
    </label>
  );
}
