import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, motion } from "../theme/tokens.stylex";

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "16px minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: 9,
    width: "100%",
    minHeight: 28,
    paddingBlock: 0,
    paddingInlineStart: 8,
    paddingInlineEnd: 6,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: "transparent",
    color: colors.text,
    fontSize: 12.5,
    textAlign: "start",
    cursor: "pointer",
    outline: "none",
    transitionProperty: "background-color",
    transitionDuration: "60ms",
  },
  active: { backgroundColor: "rgba(255, 255, 255, 0.075)" },
  danger: { color: colors.danger },
  dangerActive: { backgroundColor: colors.dangerSoft },
  disabled: { color: colors.faint, cursor: "default" },
  lead: {
    display: "grid",
    placeItems: "center",
    color: colors.muted,
    transitionProperty: "color",
    transitionDuration: motion.fast,
  },
  leadActive: { color: colors.text },
  leadAccent: { color: colors.accent2 },
  leadDanger: { color: colors.danger },
  leadDisabled: { color: colors.faint, opacity: 0.7 },
  label: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  font: (family: string) => ({ fontFamily: `"${family}", system-ui, sans-serif` }),
  trail: { display: "flex", alignItems: "center", gap: 2, color: colors.faint },
});

/**
 * One row of a menu or listbox: a leading glyph (icon or check), the label
 * and trailing content (shortcut, submenu chevron). Shared so menus and
 * dropdowns highlight, dim and align identically.
 */
export function ListRow({
  role,
  label,
  lead,
  leadTone = "muted",
  trail,
  active,
  disabled,
  danger,
  selected,
  index,
  labelFont,
  title,
  onHover,
  onPick,
}: {
  role: "menuitem" | "menuitemcheckbox" | "option";
  label: ReactNode;
  lead?: ReactNode;
  leadTone?: "muted" | "accent";
  trail?: ReactNode;
  active: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** aria-checked or aria-selected, depending on the role. */
  selected?: boolean;
  index: number;
  /** Renders the label in this font family, as a preview. */
  labelFont?: string;
  title?: string;
  onHover: () => void;
  onPick: () => void;
}) {
  const highlighted = active && !disabled;
  return (
    <div
      role={role}
      aria-checked={role === "menuitemcheckbox" ? selected : undefined}
      aria-selected={role === "option" ? selected : undefined}
      aria-disabled={disabled || undefined}
      data-index={index}
      title={title}
      onPointerMove={() => !active && onHover()}
      onClick={() => !disabled && onPick()}
      {...stylex.props(
        styles.row,
        danger && styles.danger,
        highlighted && (danger ? styles.dangerActive : styles.active),
        disabled && styles.disabled,
      )}
    >
      <span
        {...stylex.props(
          styles.lead,
          leadTone === "accent" && styles.leadAccent,
          highlighted && leadTone === "muted" && styles.leadActive,
          danger && styles.leadDanger,
          disabled && styles.leadDisabled,
        )}
      >
        {lead}
      </span>
      <span {...stylex.props(styles.label, labelFont !== undefined && styles.font(labelFont))}>
        {label}
      </span>
      <span {...stylex.props(styles.trail)}>{trail}</span>
    </div>
  );
}
