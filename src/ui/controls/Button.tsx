import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, shadows, sizes } from "../theme/tokens.stylex";
import { surfaces } from "./surfaces";

const styles = stylex.create({
  base: {
    height: sizes.control,
    paddingBlock: 0,
    paddingInline: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontSize: 12.5,
    fontWeight: 500,
    whiteSpace: "nowrap",
    textDecoration: "none",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.45 },
  },
  primary: {
    borderColor: { default: "transparent", ":hover:not(:disabled)": "transparent" },
    color: colors.onAccent,
    fontWeight: 600,
    backgroundColor: { default: colors.accent, ":hover:not(:disabled)": colors.accentHover },
    boxShadow: {
      default: "0 1px 2px rgba(20, 16, 32, 0.16)",
      ":focus-visible": shadows.ring,
    },
  },
  large: { height: 36, paddingInline: 14 },
  danger: {
    color: { default: colors.danger, ":hover:not(:disabled)": "#ff8590" },
    backgroundColor: { default: colors.raised, ":hover:not(:disabled)": colors.dangerSoft },
  },
});

type Variant = "default" | "primary" | "danger";

interface Props {
  children: ReactNode;
  variant?: Variant;
  title?: string;
  disabled?: boolean;
  size?: "default" | "large";
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
  size = "default",
  onClick,
  href,
  download,
}: Props) {
  const props = stylex.props(
    surfaces.raised,
    styles.base,
    size === "large" && styles.large,
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
