import * as stylex from "@stylexjs/stylex";
import type { ShaderError } from "../../engine/gpu";
import { colors, fonts, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  banner: {
    position: "absolute",
    insetInline: 6,
    bottom: 6,
    maxHeight: "70%",
    overflowY: "auto",
    display: "grid",
    gap: 2,
    paddingBlock: 6,
    paddingInline: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 93, 108, 0.45)",
    backgroundColor: "rgba(28, 12, 16, 0.92)",
    backdropFilter: "blur(6px)",
  },
  heading: {
    paddingInline: 4,
    paddingBottom: 2,
    color: colors.danger,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  error: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
    width: "100%",
    paddingBlock: 3,
    paddingInline: 4,
    borderWidth: 0,
    borderRadius: radii.sm,
    textAlign: "start",
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 1.45,
    color: colors.text,
    backgroundColor: { default: "transparent", ":hover:enabled": "rgba(255, 93, 108, 0.14)" },
    cursor: { default: "default", ":enabled": "pointer" },
  },
  line: { flexShrink: 0, minWidth: 44, color: colors.danger },
  message: { minWidth: 0, overflowWrap: "anywhere" },
});

/** Compile errors over the (dimmed) preview; a click on one jumps to its line. */
export function ErrorBanner({
  errors,
  onJump,
}: {
  errors: readonly ShaderError[];
  onJump: (line: number) => void;
}) {
  return (
    <div role="alert" {...stylex.props(styles.banner)}>
      <div {...stylex.props(styles.heading)}>
        {errors.length === 1 ? "1 error" : `${errors.length} errors`}
      </div>
      {errors.map(({ line, message }, i) => (
        <button
          key={i}
          type="button"
          disabled={line === null}
          title={line === null ? undefined : `Go to line ${line}`}
          onClick={() => line !== null && onJump(line)}
          {...stylex.props(styles.error)}
        >
          <span {...stylex.props(styles.line)}>{line === null ? "—" : `L${line}`}</span>
          <span {...stylex.props(styles.message)}>{message}</span>
        </button>
      ))}
    </div>
  );
}
