import * as stylex from "@stylexjs/stylex";
import { useSession } from "../../store/session";
import { colors } from "../theme/tokens.stylex";
import { useNow } from "./use-now";

const styles = stylex.create({
  status: {
    flexShrink: 0,
    fontSize: 11,
    color: colors.faint,
    whiteSpace: "nowrap",
  },
});

export function SavedStatus() {
  const saving = useSession((s) => s.saving);
  const savedAt = useSession((s) => s.savedAt);
  const now = useNow(15_000);
  const minutes = savedAt === null ? 0 : Math.floor((now - savedAt) / 60_000);
  const label = saving
    ? "Saving…"
    : savedAt === null
      ? "Not saved yet"
      : `Saved ${minutes < 1 ? "just now" : `${minutes} min ago`}`;
  return <span {...stylex.props(styles.status)}>· {label}</span>;
}
