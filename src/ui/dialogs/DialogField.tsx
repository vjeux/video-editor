import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  field: { display: "grid", gap: 6, color: colors.muted, fontSize: 12 },
});

/** Caption stacked above a dialog control (the control carries its own aria-label). */
export function DialogField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.field)}>
      <span aria-hidden>{label}</span>
      {children}
    </div>
  );
}
