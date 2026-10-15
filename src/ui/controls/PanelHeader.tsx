import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  header: {
    height: 40,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBlock: 0,
    paddingInline: 12,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    backgroundColor: colors.panel,
  },
  title: { margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.3px" },
  aside: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
});

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div {...stylex.props(styles.header)}>
      <h3 {...stylex.props(styles.title)}>{title}</h3>
      {children && <div {...stylex.props(styles.aside)}>{children}</div>}
    </div>
  );
}
