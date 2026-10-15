import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, type CSSProperties } from "react";
import { Toaster, toast } from "sonner";
import { noticeStore, useNotices } from "../../store/notices";
import { colors, fonts, shadows } from "../theme/tokens.stylex";
import { useTheme } from "../theme/use-theme";

const styles = stylex.create({
  description: { color: colors.muted },
});

const dismiss = (id: number) => noticeStore.getState().dismiss(id);
const toastId = (id: number) => `cutline-notice-${id}`;

export function Notices() {
  const notices = useNotices();
  const theme = useTheme();
  const delivered = useRef(new Set<number>());

  useEffect(() => {
    // Keep application notices independent of their presentation. Deliver each
    // one once so unrelated notifications never restart an existing timer.
    const active = new Set(notices.map((notice) => notice.id));
    for (const id of delivered.current) {
      if (active.has(id)) continue;
      toast.dismiss(toastId(id));
      delivered.current.delete(id);
    }
    for (const notice of notices) {
      if (delivered.current.has(notice.id)) continue;
      delivered.current.add(notice.id);
      toast[notice.tone](notice.message, {
        id: toastId(notice.id),
        description: notice.description && (
          <span {...stylex.props(styles.description)}>{notice.description}</span>
        ),
        duration: notice.tone === "error" ? 8000 : 5000,
        onDismiss: () => dismiss(notice.id),
        onAutoClose: () => dismiss(notice.id),
      });
    }
  }, [notices]);

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      offset={20}
      mobileOffset={16}
      visibleToasts={3}
      gap={10}
      closeButton
      containerAriaLabel="Notifications"
      style={
        {
          "--normal-bg": colors.panel,
          "--normal-bg-hover": colors.panel2,
          "--normal-text": colors.text,
          "--normal-border": colors.line2,
          "--normal-border-hover": colors.line2,
          "--border-radius": "10px",
          fontFamily: fonts.sans,
          zIndex: 110,
        } as CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        style: { padding: "14px 16px", gap: 10, boxShadow: shadows.pop, userSelect: "text" },
      }}
    />
  );
}
