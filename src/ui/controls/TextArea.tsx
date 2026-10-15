import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent } from "react";
import { colors, fonts, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  area: {
    width: "100%",
    minHeight: 34,
    paddingBlock: 7,
    paddingInline: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus": colors.accent },
    backgroundColor: colors.bg,
    color: colors.text,
    outline: "none",
    resize: "vertical",
    userSelect: "text",
  },
  code: {
    minHeight: 280,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 1.55,
    tabSize: 2,
    whiteSpace: "pre",
  },
});

export function TextArea({
  value,
  onChange,
  label,
  rows,
  code,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  rows?: number;
  /** Monospaced editor styling. */
  code?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      aria-label={label}
      rows={rows}
      value={value}
      spellCheck={!code}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      {...stylex.props(styles.area, code && styles.code)}
    />
  );
}
