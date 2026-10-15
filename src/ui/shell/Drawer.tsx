import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, type ReactNode } from "react";
import { colors, radii, shadows } from "../theme/tokens.stylex";
import { IconButton } from "../controls/IconButton";

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    top: 52,
    zIndex: 60,
    backgroundColor: "rgba(5, 6, 8, 0.55)",
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 0.2s",
  },
  backdropOpen: { opacity: 1, pointerEvents: "auto" },
  panel: {
    position: "fixed",
    top: 60,
    bottom: 8,
    zIndex: 61,
    width: "min(340px, calc(100vw - 16px))",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.panel,
    boxShadow: shadows.dialog,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    overflow: "hidden",
    visibility: "hidden",
    transition: "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0.22s",
  },
  left: { left: 8, transform: "translateX(calc(-100% - 8px))" },
  right: { right: 8, transform: "translateX(calc(100% + 8px))" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    height: 40,
    paddingInline: 12,
    fontSize: 12,
    fontWeight: 600,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  open: {
    visibility: "visible",
    transform: "translateX(0)",
    transition: "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s",
  },
});

/**
 * A slide-over side panel for narrow screens. It stays mounted while closed
 * (inert) so the panel keeps its state; Escape or a tap outside closes it.
 */
export function Drawer({
  side,
  open,
  label,
  onClose,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && open && !e.defaultPrevented) onClose();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <>
      <div
        aria-hidden
        onPointerDown={onClose}
        {...stylex.props(styles.backdrop, open && styles.backdropOpen)}
      />
      <div
        aria-label={`${label} panel`}
        // While open it behaves as a modal sheet, so editor shortcuts stand down.
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        inert={!open}
        {...stylex.props(
          styles.panel,
          side === "left" ? styles.left : styles.right,
          open && styles.open,
        )}
      >
        <div {...stylex.props(styles.header)}>
          {label}
          <IconButton icon="close" title={`Close ${label.toLowerCase()}`} onClick={onClose} small />
        </div>
        {children}
      </div>
    </>
  );
}
