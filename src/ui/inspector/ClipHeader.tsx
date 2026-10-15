import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { formatTimecode } from "../../core/time";
import { clipEnd } from "../../core/timeline";
import { trackLabel } from "../../core/tracks";
import type { Clip } from "../../core/types";
import { useEditor, useMedia } from "../../store";
import { BitmapCanvas } from "../controls/BitmapCanvas";
import { Icon } from "../controls/Icon";
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
  thumb: {
    position: "relative",
    width: 44,
    height: 28,
    flexShrink: 0,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.sm,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  text: { backgroundColor: colors.title },
  media: { backgroundColor: colors.video2 },
  adjustment: { backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})` },
  info: { flexGrow: 1, minWidth: 0 },
  name: {
    display: "block",
    fontWeight: 550,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meta: {
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
});

/** Placeholder shown when a clip has no poster frame. */
const THUMBS: Record<Clip["type"], ReactNode> = {
  media: <Icon name="music" size={14} />,
  text: "T",
  adjustment: <Icon name="eye" size={14} />,
};

/** Identifies the selected clip: thumbnail, name, track and time span. */
export function ClipHeader({ clip }: { clip: Clip }) {
  const fps = useEditor((s) => s.project.settings.fps);
  const label = useEditor((s) => trackLabel(s.project, clip.trackId));
  const name = useEditor((s) => clipName(clip, s.project));
  const poster = useMedia((s) =>
    clip.type === "media" ? s.assets[clip.assetId]?.poster : undefined,
  );
  return (
    <div {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.thumb, styles[clip.type])}>
        {poster ? <BitmapCanvas bitmap={poster} /> : THUMBS[clip.type]}
      </div>
      <div {...stylex.props(styles.info)}>
        <b {...stylex.props(styles.name)}>{name}</b>
        <span {...stylex.props(styles.meta)}>
          {label} · {formatTimecode(clip.start, fps)} → {formatTimecode(clipEnd(clip), fps)}
        </span>
      </div>
    </div>
  );
}
