import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  brand: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 650,
    letterSpacing: "0.2px",
  },
  word: { display: { default: "inline", "@media (max-width: 599px)": "none" } },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})`,
    display: "grid",
    placeItems: "center",
  },
});

export function Brand() {
  return (
    <div {...stylex.props(styles.brand)}>
      <div {...stylex.props(styles.logo)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M7 4l13 8-13 8z" />
        </svg>
      </div>
      <span {...stylex.props(styles.word)}>Cutline</span>
    </div>
  );
}
