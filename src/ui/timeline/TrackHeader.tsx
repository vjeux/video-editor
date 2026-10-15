import * as stylex from "@stylexjs/stylex";
import { openMenu, trackMenu } from "../../app/menus";
import type { ReactNode } from "react";
import { removeTrack, trackLabel } from "../../core/tracks";
import type { Track } from "../../core/types";
import { useEditor } from "../../store";
import { Icon } from "../controls/Icon";
import { colors, fonts, radii } from "../theme/tokens.stylex";
import { LANE_HEIGHT } from "./lanes";

type Flag = "muted" | "solo" | "hidden" | "locked";
type Tone = "accent" | "mute" | "solo";

const styles = stylex.create({
  head: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingBlock: 0,
    paddingInlineStart: 10,
    paddingInlineEnd: 6,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  height: (height: number) => ({ height }),
  tag: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: 600,
    minWidth: 24,
    height: 18,
    borderRadius: radii.sm,
    display: "grid",
    placeItems: "center",
    paddingBlock: 0,
    paddingInline: 3,
  },
  video: {
    color: colors.video,
    backgroundColor: `color-mix(in srgb, ${colors.video} 22%, transparent)`,
  },
  audio: {
    color: colors.audio,
    backgroundColor: `color-mix(in srgb, ${colors.audio} 22%, transparent)`,
  },
  text: {
    color: colors.title,
    backgroundColor: `color-mix(in srgb, ${colors.title} 22%, transparent)`,
  },
  name: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontSize: 12,
    color: { default: colors.muted, ":focus": colors.text },
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: "transparent", ":focus": colors.accent },
    borderRadius: radii.sm,
    paddingBlock: 2,
    paddingInline: 4,
    outline: "none",
    textOverflow: "ellipsis",
    // Too narrow to read on phones: keep the spacing, show the name as a tooltip.
    visibility: { default: "visible", "@media (max-width: 599px)": "hidden" },
  },
  mini: {
    width: 20,
    height: 20,
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.sm,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: 600,
    color: { default: colors.faint, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
  accent: { color: { default: colors.accent2, ":hover": colors.accent2 } },
  mute: { color: { default: colors.danger, ":hover": colors.danger } },
  solo: { color: { default: colors.music, ":hover": colors.music } },
});

export function TrackHeader({ track }: { track: Track }) {
  const label = useEditor((s) => trackLabel(s.project, track.id));
  const isOnly = useEditor(
    (s) => s.project.tracks.filter((t) => t.kind === track.kind).length === 1,
  );
  const commit = useEditor((s) => s.commit);
  const toggle = (flag: Flag) =>
    commit((p) => ({
      ...p,
      tracks: p.tracks.map((t) => (t.id === track.id ? { ...t, [flag]: !t[flag] } : t)),
    }));

  const mini = (
    title: string,
    onClick: () => void,
    children: ReactNode,
    on = false,
    tone: Tone = "accent",
  ) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={onClick}
      {...stylex.props(styles.mini, on && styles[tone])}
    >
      {children}
    </button>
  );

  return (
    <div
      title={track.name}
      onContextMenu={(e) => openMenu(e, trackMenu(track.id))}
      {...stylex.props(styles.head, styles.height(LANE_HEIGHT[track.kind]))}
    >
      <span {...stylex.props(styles.tag, styles[track.kind])}>{label}</span>
      <input
        aria-label="Track name"
        value={track.name}
        onChange={(e) =>
          commit(
            (p) => ({
              ...p,
              tracks: p.tracks.map((t) => (t.id === track.id ? { ...t, name: e.target.value } : t)),
            }),
            { coalesce: `track-name:${track.id}` },
          )
        }
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        {...stylex.props(styles.name)}
      />
      {track.kind === "audio" ? (
        <>
          {mini("Mute", () => toggle("muted"), "M", track.muted, "mute")}
          {mini("Solo", () => toggle("solo"), "S", track.solo, "solo")}
        </>
      ) : (
        <>
          {track.kind === "video" &&
            mini("Mute clip audio", () => toggle("muted"), "M", track.muted, "mute")}
          {mini(
            track.hidden ? "Show track" : "Hide track",
            () => toggle("hidden"),
            <Icon name={track.hidden ? "eyeOff" : "eye"} size={12} />,
            track.hidden,
          )}
        </>
      )}
      {mini(
        track.locked ? "Unlock" : "Lock",
        () => toggle("locked"),
        <Icon name={track.locked ? "lock" : "unlock"} size={12} />,
        track.locked,
      )}
      {!isOnly &&
        mini(
          "Delete track",
          () => commit((p) => removeTrack(p, track.id)),
          <Icon name="close" size={11} />,
        )}
    </div>
  );
}
