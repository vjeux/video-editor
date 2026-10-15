import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  base: {
    height: 30,
    paddingBlock: 0,
    paddingInline: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    whiteSpace: "nowrap",
    textDecoration: "none",
    color: colors.text,
    backgroundColor: { default: "transparent", ":hover:not(:disabled)": colors.panel2 },
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.4 },
  },
  primary: {
    borderColor: "transparent",
    color: "#fff",
    fontWeight: 550,
    backgroundColor: { default: colors.accent, ":hover:not(:disabled)": colors.accentHover },
  },
  danger: { color: colors.danger },
});

type Variant = "default" | "primary" | "danger";

interface Props {
  children: ReactNode;
  variant?: Variant;
  title?: string;
  disabled?: boolean;
  onClick?: () => void;
  /** Renders a download link styled as a button. */
  href?: string;
  download?: string;
}

export function Button({
  children,
  variant = "default",
  title,
  disabled,
  onClick,
  href,
  download,
}: Props) {
  const props = stylex.props(
    styles.base,
    variant === "primary" && styles.primary,
    variant === "danger" && styles.danger,
  );
  return href ? (
    <a href={href} download={download} title={title} {...props}>
      {children}
    </a>
  ) : (
    <button type="button" title={title} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
