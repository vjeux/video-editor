import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  button: {
    width: 24,
    height: 24,
    flexShrink: 0,
    padding: 0,
    borderRadius: radii.md,
    borderWidth: 0,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
});

/** Compact icon button for panel headers; takes any icon node. */
export function HeaderAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      {...stylex.props(styles.button)}
    >
      {children}
    </button>
  );
}
