import * as stylex from "@stylexjs/stylex";
import { formatTimecode } from "../../core/time";
import type { Clip } from "../../core/types";
import { useEditor } from "../../store";
import { colors, fonts, radii } from "../theme/tokens.stylex";
import { clipName } from "./clip-name";

const styles = stylex.create({
  header: {
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  badge: {
    width: 44,
    height: 28,
    flexShrink: 0,
    borderRadius: radii.sm,
    backgroundImage: `linear-gradient(90deg, ${colors.video2} 30%, ${colors.accent} 50%, ${colors.title} 70%)`,
  },
  info: { flexGrow: 1, minWidth: 0 },
  line: { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  title: { fontWeight: 550 },
  meta: { color: colors.faint, fontFamily: fonts.mono, fontSize: 11 },
  names: { color: colors.muted, fontSize: 11.5 },
});

/** Identifies the selected transition: the two clips it joins and the time of the cut. */
export function TransitionHeader({ from, to }: { from: Clip; to: Clip }) {
  const fps = useEditor((s) => s.project.settings.fps);
  const fromName = useEditor((s) => clipName(from, s.project));
  const toName = useEditor((s) => clipName(to, s.project));
  return (
    <div {...stylex.props(styles.header)}>
      <div aria-hidden {...stylex.props(styles.badge)} />
      <div {...stylex.props(styles.info)}>
        <b {...stylex.props(styles.line, styles.title)}>Transition</b>
        <span title={`${fromName} → ${toName}`} {...stylex.props(styles.line, styles.names)}>
          {fromName} → {toName}
        </span>
        <span {...stylex.props(styles.line, styles.meta)}>
          Cut at {formatTimecode(to.start, fps)}
        </span>
      </div>
    </div>
  );
}
