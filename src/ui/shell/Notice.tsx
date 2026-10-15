import * as stylex from "@stylexjs/stylex";
import { useEffect } from "react";
import type { Notice as NoticeData } from "../../store/notices";
import { IconButton } from "../controls/IconButton";
import { colors, radii, shadows } from "../theme/tokens.stylex";

const LIFETIME_MS = 7000;

const rise = stylex.keyframes({ from: { transform: "translateY(8px)", opacity: 0 } });

const styles = stylex.create({
  notice: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    borderInlineStartWidth: 3,
    borderInlineStartColor: colors.accent,
    backgroundColor: colors.panel2,
    boxShadow: shadows.pop,
    animationName: rise,
    animationDuration: "0.2s",
    animationTimingFunction: "ease-out",
  },
  error: { borderInlineStartColor: colors.danger },
  message: { margin: 0, flexGrow: 1, fontSize: 12.5, userSelect: "text" },
});

export function Notice({
  notice,
  onDismiss,
}: {
  notice: NoticeData;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [notice.id, onDismiss]);
  return (
    <div {...stylex.props(styles.notice, notice.tone === "error" && styles.error)}>
      <p {...stylex.props(styles.message)}>{notice.message}</p>
      <IconButton
        icon="close"
        title="Dismiss"
        size={12}
        small
        onClick={() => onDismiss(notice.id)}
      />
    </div>
  );
}
