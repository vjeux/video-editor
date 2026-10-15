import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  separator: { height: 1, marginBlock: 4, marginInline: 6, backgroundColor: colors.line },
});

export function MenuSeparator() {
  return <div role="separator" {...stylex.props(styles.separator)} />;
}
