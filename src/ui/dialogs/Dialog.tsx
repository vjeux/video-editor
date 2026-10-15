import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useId, type ReactNode } from "react";
import { IconButton } from "../controls/IconButton";
import { colors, radii, shadows } from "../theme/tokens.stylex";

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(5, 6, 8, 0.6)",
    backdropFilter: "blur(4px)",
  },
  dialog: {
    width: "min(440px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    backgroundColor: colors.panel,
    boxShadow: shadows.dialog,
  },
  wide: { width: "min(720px, calc(100vw - 32px))" },
  studio: { width: "min(1200px, calc(100vw - 32px))", height: "min(820px, calc(100vh - 32px))" },
  header: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingInline: 18,
    paddingBottom: 6,
  },
  title: { margin: 0, fontSize: 15, fontWeight: 600 },
  body: {
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    gap: 14,
    paddingTop: 8,
    paddingInline: 18,
    paddingBottom: 16,
  },
  footer: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingBlock: 12,
    paddingInline: 18,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
  },
  note: { flexGrow: 1, minWidth: 0, color: colors.faint, fontSize: 12 },
});

/** Modal shell. Escape and backdrop clicks close it unless `dismissable` is false. */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  note,
  wide,
  size,
  dismissable = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Muted text at the start of the footer. */
  note?: ReactNode;
  wide?: boolean;
  /** Workspace-sized modal (Effect Studio). */
  size?: "studio";
  dismissable?: boolean;
}) {
  const titleId = useId();
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented && dismissable) onClose();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onEscape(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div
      onPointerDown={(e) => e.target === e.currentTarget && dismissable && onClose()}
      {...stylex.props(styles.backdrop)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...stylex.props(styles.dialog, wide && styles.wide, size === "studio" && styles.studio)}
      >
        <header {...stylex.props(styles.header)}>
          <h2 id={titleId} {...stylex.props(styles.title)}>
            {title}
          </h2>
          <IconButton icon="close" title="Close" onClick={onClose} size={14} />
        </header>
        <div {...stylex.props(styles.body)}>{children}</div>
        <footer {...stylex.props(styles.footer)}>
          <span {...stylex.props(styles.note)}>{note}</span>
          {footer}
        </footer>
      </div>
    </div>
  );
}
