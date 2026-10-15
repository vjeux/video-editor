import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";
const styles = stylex.create({
  hint: { fontSize: 11, lineHeight: 1.5, color: colors.faint, marginBlock: 8 },
});

export function AppearanceHint({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.hint)}>{children}</p>;
}
