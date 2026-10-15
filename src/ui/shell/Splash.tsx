import * as stylex from "@stylexjs/stylex";
import { Spinner } from "../controls/Spinner";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  splash: {
    height: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 14,
    backgroundColor: colors.bg,
    color: colors.muted,
    fontSize: 12.5,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})`,
  },
});

/** Shown while the saved project is read back from IndexedDB. */
export function Splash() {
  return (
    <div {...stylex.props(styles.splash)}>
      <div {...stylex.props(styles.logo)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M7 4l13 8-13 8z" />
        </svg>
      </div>
      <Spinner />
      Opening your project…
    </div>
  );
}
