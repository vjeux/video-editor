import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238b91a1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

const styles = stylex.create({
  select: {
    appearance: "none",
    minWidth: 0,
    height: 30,
    paddingBlock: 0,
    paddingInlineStart: 8,
    paddingInlineEnd: 24,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus": colors.accent },
    backgroundColor: colors.bg,
    backgroundImage: CHEVRON,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    fontSize: 12,
    color: colors.text,
    outline: "none",
    cursor: "pointer",
  },
  compact: {
    height: 26,
    borderColor: { default: colors.line2, ":focus": colors.accent },
    backgroundColor: colors.panel,
    color: { default: colors.muted, ":hover": colors.text },
  },
  full: { width: "100%" },
});

export function Select({
  value,
  onChange,
  label,
  children,
  compact,
  disabled,
}: {
  value: string | number;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
  /** Toolbar-sized variant. */
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      {...stylex.props(styles.select, compact ? styles.compact : styles.full)}
    >
      {children}
    </select>
  );
}
