import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { colors } from "../theme/tokens.stylex";
import { LIBRARY_TABS, type LibraryTab } from "./tabs";

const styles = stylex.create({
  list: {
    display: "flex",
    alignItems: "stretch",
    gap: 2,
    height: 44,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  tab: {
    flexGrow: 1,
    minWidth: 0,
    paddingBlock: 0,
    paddingInline: { default: 6, "@media (max-width: 1199px)": 3 },
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
    color: { default: colors.muted, ":hover": colors.text },
    fontSize: { default: 11.5, "@media (max-width: 1199px)": 10.5 },
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  active: {
    color: { default: colors.accent2, ":hover": colors.accent2 },
    backgroundColor: { default: colors.panel3, ":hover": colors.panel3 },
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 1px 3px rgba(0, 0, 0, 0.2)",
    fontWeight: 600,
  },
});

/** The library's tab bar: compact tabs with arrow-key navigation. */
export function LibraryTabs({
  value,
  onChange,
  id,
}: {
  id: string;
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
        const index = LIBRARY_TABS.findIndex((t) => t.value === value);
        const step = {
          ArrowRight: 1,
          ArrowLeft: -1,
          Home: -index,
          End: LIBRARY_TABS.length - 1 - index,
        }[e.key];
        if (step === undefined) return;
        e.preventDefault();
        e.stopPropagation();
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
            id={`${id}-${tab.value}`}
            aria-controls={`${id}-panel`}
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
