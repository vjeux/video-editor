import * as stylex from "@stylexjs/stylex";
import { formatTimecode } from "../../core/time";
import { projectDuration } from "../../core/timeline";
import { useEditor } from "../../store";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  timecode: {
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
    color: colors.text,
  },
  total: { color: colors.faint, fontSize: 12 },
});

export function Timecode() {
  const playhead = useEditor((s) => s.playhead);
  const fps = useEditor((s) => s.project.settings.fps);
  const duration = useEditor((s) => projectDuration(s.project));
  return (
    <div aria-live="off" {...stylex.props(styles.timecode)}>
      <span>{formatTimecode(playhead, fps)}</span>{" "}
      <small {...stylex.props(styles.total)}>/ {formatTimecode(duration, fps)}</small>
    </div>
  );
}
