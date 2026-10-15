import * as stylex from "@stylexjs/stylex";
import { Spinner } from "../controls/Spinner";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  thumb: {
    aspectRatio: "16 / 10",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  name: { marginTop: 5, fontSize: 11, color: colors.muted },
});

/** Placeholder tile shown while files are still being probed. */
export function ImportingCard() {
  return (
    <div aria-live="polite">
      <div {...stylex.props(styles.thumb)}>
        <Spinner />
      </div>
      <div {...stylex.props(styles.name)}>Importing…</div>
    </div>
  );
}
