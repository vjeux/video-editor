import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "70px minmax(0, 1fr) 72px",
    alignItems: "center",
    gap: 8,
    marginBottom: { default: 9, ":last-child": 0 },
  },
  wide: { gridTemplateColumns: "70px minmax(0, 1fr)" },
  label: { color: colors.muted, fontSize: 12 },
});

/** Inspector row: label, control and (unless `wide`) a trailing value cell. */
export function Row({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.row, wide && styles.wide)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      {children}
    </div>
  );
}
