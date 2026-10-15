import * as stylex from "@stylexjs/stylex";
import { useSession } from "../../store/session";
import { colors } from "../theme/tokens.stylex";
import { Icon } from "../controls/Icon";
import { useNow } from "./use-now";

const styles = stylex.create({
  status: {
    flexShrink: 0,
    fontSize: 11,
    color: colors.faint,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  saved: { color: colors.audio },
});

export function SavedStatus() {
  const saving = useSession((s) => s.saving);
  const fileTask = useSession((s) => s.fileTask);
  const savedAt = useSession((s) => s.savedAt);
  const now = useNow(15_000);
  const minutes = savedAt === null ? 0 : Math.floor((now - savedAt) / 60_000);
  const label = saving
    ? "Saving…"
    : savedAt === null
      ? "Saved after your first edit"
      : `Saved ${minutes < 1 ? "just now" : `${minutes} min ago`}`;
  return (
    <span {...stylex.props(styles.status)} title={label}>
      <span {...stylex.props(savedAt !== null && !saving && styles.saved)}>
        <Icon name={savedAt !== null && !saving ? "check" : "lock"} size={12} />
      </span>
      {fileTask === "saving"
        ? "Preparing file…"
        : fileTask === "opening"
          ? "Opening…"
          : saving
            ? "Saving…"
            : savedAt === null
              ? "Local project"
              : "Saved on device"}
    </span>
  );
}
