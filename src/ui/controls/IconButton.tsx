import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "../theme/tokens.stylex";
import { Icon } from "./Icon";
import type { IconName } from "./icon-paths";

const styles = stylex.create({
  base: {
    width: 30,
    height: 30,
    flexShrink: 0,
    padding: 0,
    borderRadius: radii.md,
    borderWidth: 0,
    display: "grid",
    placeItems: "center",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.4 },
    color: { default: colors.muted, ":hover:not(:disabled)": colors.text },
    backgroundColor: { default: "transparent", ":hover:not(:disabled)": colors.panel2 },
  },
  small: { width: 24, height: 24 },
  on: {
    color: { default: colors.accent2, ":hover:not(:disabled)": colors.accent2 },
    backgroundColor: { default: colors.accentSoft, ":hover:not(:disabled)": colors.accentSoft },
  },
});

export function IconButton({
  icon,
  title,
  onClick,
  on,
  disabled,
  size = 16,
  small,
}: {
  icon: IconName;
  title: string;
  onClick: () => void;
  on?: boolean;
  disabled?: boolean;
  size?: number;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      {...stylex.props(styles.base, small && styles.small, on && styles.on)}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
