import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  group: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  title: {
    marginTop: 0,
    marginInline: 0,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: colors.muted,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

/** A titled inspector section with an optional header action. */
export function Group({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} {...stylex.props(styles.group)}>
      <h4 {...stylex.props(styles.title)}>
        {title}
        {action}
      </h4>
      {children}
    </section>
  );
}
