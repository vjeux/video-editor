import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent } from "react";
import { fonts } from "../theme/tokens.stylex";
import { surfaces } from "./surfaces";

const styles = stylex.create({
  area: {
    width: "100%",
    height: "auto",
    minHeight: 34,
    paddingBlock: 7,
    paddingInline: 9,
    lineHeight: 1.45,
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
      {...stylex.props(surfaces.well, styles.area, code && styles.code)}
    />
  );
}
