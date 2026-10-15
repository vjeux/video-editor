import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";
const styles = stylex.create({
  fold: {
    marginBlock: 10,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
  },
  summary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBlock: 10,
    fontSize: 12,
    color: colors.muted,
    cursor: "pointer",
    listStyle: "none",
    "::marker": { content: '""' },
  },
  title: { display: "flex", alignItems: "center", gap: 6 },
  chevron: {
    fontSize: 10,
    transition: "transform 120ms",
    transform: { default: "rotate(0deg)", [stylex.when.ancestor("[open]")]: "rotate(90deg)" },
  },
  value: { color: colors.faint, fontSize: 10.5 },
});
export function AppearanceFold({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <details {...stylex.props(styles.fold)}>
      <summary {...stylex.props(styles.summary)}>
        <span {...stylex.props(styles.title)}>
          <span aria-hidden {...stylex.props(styles.chevron)}>
            ›
          </span>
          {title}
        </span>
        <span {...stylex.props(styles.value)}>{summary}</span>
      </summary>
      {children}
    </details>
  );
}
