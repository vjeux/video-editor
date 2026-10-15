import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { PanelHeader } from "../controls/PanelHeader";
import { colors } from "../theme/tokens.stylex";
import { LibrarySearch } from "./LibrarySearch";

const styles = stylex.create({
  frame: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  actions: { display: "flex", alignItems: "center", gap: 2 },
  grid: {
    flexGrow: 1,
    minHeight: 0,
    overflowX: "hidden",
    overflowY: "auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    alignContent: "start",
    gap: 10,
    paddingTop: 0,
    paddingInline: 12,
    paddingBottom: 12,
  },
  empty: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    paddingBlock: 28,
    paddingInline: 8,
    color: colors.faint,
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "center",
  },
});

/** Shared layout of the library browsers: header actions, search, filters and a tile grid. */
export function BrowserFrame({
  title,
  actions,
  query,
  onQuery,
  filters,
  empty,
  children,
}: {
  title: string;
  actions?: ReactNode;
  query: string;
  onQuery: (query: string) => void;
  filters: ReactNode;
  /** Shown instead of tiles when nothing matches. */
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.frame)}>
      <PanelHeader title={title}>
        {actions && <div {...stylex.props(styles.actions)}>{actions}</div>}
      </PanelHeader>
      <LibrarySearch label={`Search ${title.toLowerCase()}`} value={query} onChange={onQuery} />
      {filters}
      <div {...stylex.props(styles.grid)}>
        {children}
        {empty && <div {...stylex.props(styles.empty)}>{empty}</div>}
      </div>
    </div>
  );
}
