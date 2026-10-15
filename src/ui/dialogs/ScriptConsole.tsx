import * as stylex from "@stylexjs/stylex";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  console: {
    maxHeight: 120,
    overflow: "auto",
    paddingBlock: 8,
    paddingInline: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11.5,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    userSelect: "text",
  },
  error: { color: colors.danger },
});

/** Output of the last script run: its log lines, then the outcome. */
export function ScriptConsole({ logs, error }: { logs: readonly string[]; error: string | null }) {
  return (
    <div aria-live="polite" {...stylex.props(styles.console)}>
      {logs.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      {error ? (
        <div {...stylex.props(styles.error)}>Error: {error} — nothing was changed.</div>
      ) : (
        <div>✓ Applied. Undo with ⌘Z.</div>
      )}
    </div>
  );
}
