import * as stylex from "@stylexjs/stylex";
import { noticeStore, useNotices } from "../../store/notices";
import { Notice } from "./Notice";

const styles = stylex.create({
  stack: {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 110,
    display: "grid",
    gap: 8,
    width: "min(360px, calc(100vw - 32px))",
  },
});

const dismiss = (id: number) => noticeStore.getState().dismiss(id);

export function Notices() {
  const notices = useNotices();
  return (
    <div role="status" {...stylex.props(styles.stack)}>
      {notices.map((n) => (
        <Notice key={n.id} notice={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}
