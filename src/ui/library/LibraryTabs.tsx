import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { colors } from "../theme/tokens.stylex";
import { LIBRARY_TABS, type LibraryTab } from "./tabs";

const styles = stylex.create({
  list: {
    display: "flex",
    alignItems: "stretch",
    gap: 2,
    height: 36,
    paddingInline: { default: 6, "@media (max-width: 1100px)": 4 },
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  tab: {
    position: "relative",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 0,
    paddingBlock: 0,
    paddingInline: { default: 6, "@media (max-width: 1100px)": 3 },
    borderWidth: 0,
    backgroundColor: "transparent",
    color: { default: colors.muted, ":hover": colors.text },
    fontSize: { default: 12, "@media (max-width: 1100px)": 11 },
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    outline: "none",
    boxShadow: { default: "none", ":focus-visible": `inset 0 0 0 1.5px ${colors.accent2}` },
    borderRadius: 6,
    "::after": {
      content: '""',
      position: "absolute",
      left: 6,
      right: 6,
      bottom: -1,
      height: 2,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
  },
  active: {
    color: { default: colors.text, ":hover": colors.text },
    fontWeight: 600,
    "::after": {
      content: '""',
      position: "absolute",
      left: 6,
      right: 6,
      bottom: -1,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
  },
});

/** The library's tab bar: content-sized tabs, an accent underline, arrow keys to move. */
export function LibraryTabs({
  value,
  onChange,
}: {
  value: LibraryTab;
  onChange: (tab: LibraryTab) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const move = (delta: number) => {
    const index = LIBRARY_TABS.findIndex((t) => t.value === value);
    const next = LIBRARY_TABS[(index + delta + LIBRARY_TABS.length) % LIBRARY_TABS.length];
    if (!next) return;
    onChange(next.value);
    list.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.value}"]`)?.focus();
  };
  return (
    <div
      ref={list}
      role="tablist"
      aria-label="Library"
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        move(step);
      }}
      {...stylex.props(styles.list)}
    >
      {LIBRARY_TABS.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            data-tab={tab.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            {...stylex.props(styles.tab, selected && styles.active)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
