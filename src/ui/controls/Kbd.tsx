import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  kbd: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 17,
    height: 17,
    paddingBlock: 0,
    paddingInline: 4,
    marginInlineStart: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.07)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 1,
    color: colors.muted,
    whiteSpace: "nowrap",
  },
});

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd {...stylex.props(styles.kbd)}>{children}</kbd>;
}
