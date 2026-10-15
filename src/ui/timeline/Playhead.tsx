import * as stylex from "@stylexjs/stylex";
import { timeToX } from "../../core/layout";
import { useEditor } from "../../store";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  playhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0,
    zIndex: 7,
    pointerEvents: "none",
  },
  at: (left: number) => ({ left }),
  line: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -0.5,
    width: 1,
    backgroundColor: colors.danger,
  },
  knob: {
    position: "sticky",
    top: 2,
    marginLeft: -7,
    width: 14,
    height: 18,
    backgroundColor: colors.danger,
    clipPath: "polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)",
  },
});

/** Reads the playhead itself so playback ticks re-render only this element. */
export function Playhead() {
  const x = useEditor((s) => timeToX(s.playhead, s.pxPerSecond));
  return (
    <div {...stylex.props(styles.playhead, styles.at(x))}>
      <div {...stylex.props(styles.line)} />
      <div {...stylex.props(styles.knob)} />
    </div>
  );
}
