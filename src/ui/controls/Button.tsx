import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, sizes } from "../theme/tokens.stylex";
import { surfaces } from "./surfaces";

const styles = stylex.create({
  base: {
    height: sizes.control,
    paddingBlock: 0,
    paddingInline: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 500,
    whiteSpace: "nowrap",
    textDecoration: "none",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.45 },
  },
  primary: {
    borderColor: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
    fontWeight: 600,
    backgroundColor: { default: colors.accent, ":hover:not(:disabled)": colors.accentHover },
    backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0))",
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 14px rgba(124, 108, 255, 0.28)",
  },
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
    surfaces.raised,
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
