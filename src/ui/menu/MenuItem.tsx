import * as stylex from "@stylexjs/stylex";
import type { MenuEntry } from "../../store/context-menu";
import { Icon } from "../controls/Icon";
import { colors, fonts, radii } from "../theme/tokens.stylex";

type Item = Extract<MenuEntry, { kind: "item" }>;

const styles = stylex.create({
  item: {
    display: "grid",
    gridTemplateColumns: "16px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 28,
    paddingBlock: 0,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: radii.sm,
    backgroundColor: "transparent",
    color: colors.text,
    fontSize: 12.5,
    textAlign: "start",
    cursor: "pointer",
    outline: "none",
  },
  active: { backgroundColor: colors.accent, color: "#fff" },
  danger: { color: colors.danger },
  dangerActive: { backgroundColor: colors.danger, color: "#fff" },
  disabled: { color: colors.faint, cursor: "default" },
  label: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  shortcut: { fontFamily: fonts.mono, fontSize: 10.5, opacity: 0.6 },
});

export function MenuItem({
  item,
  active,
  onHover,
  onRun,
}: {
  item: Item;
  active: boolean;
  onHover: () => void;
  onRun: () => void;
}) {
  const highlighted = active && !item.disabled;
  return (
    <button
      type="button"
      role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={item.checked}
      aria-disabled={item.disabled}
      tabIndex={-1}
      onPointerEnter={onHover}
      onClick={() => !item.disabled && onRun()}
      {...stylex.props(
        styles.item,
        item.danger && styles.danger,
        highlighted && (item.danger ? styles.dangerActive : styles.active),
        item.disabled && styles.disabled,
      )}
    >
      <span>{item.checked && <Icon name="check" size={13} strokeWidth={2.4} />}</span>
      <span {...stylex.props(styles.label)}>{item.label}</span>
      <span {...stylex.props(styles.shortcut)}>{item.shortcut}</span>
    </button>
  );
}
