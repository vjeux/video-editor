import * as stylex from "@stylexjs/stylex";
import { ColorThumb } from "react-aria-components/ColorThumb";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  thumb: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#ffffff",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.65), 0 1px 4px rgba(0, 0, 0, 0.4)",
  },
  focused: { outline: `2px solid ${colors.accent2}`, outlineOffset: 3 },
  slider: { top: "50%" },
});

export function ColorPickerThumb({ slider = false }: { slider?: boolean }) {
  return (
    <ColorThumb
      className={({ isFocusVisible }) =>
        stylex.props(styles.thumb, slider && styles.slider, isFocusVisible && styles.focused)
          .className ?? ""
      }
    />
  );
}
