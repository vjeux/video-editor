import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  kbd: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    paddingBlock: 0,
    paddingInline: 4,
    marginInlineStart: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    whiteSpace: "nowrap",
  },
});

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd {...stylex.props(styles.kbd)}>{children}</kbd>;
}
