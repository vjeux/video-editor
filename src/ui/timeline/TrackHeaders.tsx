import * as stylex from "@stylexjs/stylex";
import type { RefObject } from "react";
import { newId } from "../../app/engine";
import { addTrack } from "../../core/tracks";
import type { TrackKind } from "../../core/types";
import { useEditor } from "../../store";
import { colors, radii } from "../theme/tokens.stylex";
import { TrackHeader } from "./TrackHeader";

const ADDABLE: { kind: TrackKind; label: string; short: string; title: string }[] = [
  { kind: "video", label: "+ Video", short: "+V", title: "Add video track" },
  { kind: "audio", label: "+ Audio", short: "+A", title: "Add audio track" },
  { kind: "text", label: "+ Title", short: "+T", title: "Add title track" },
];

const styles = stylex.create({
  heads: {
    width: { default: 200, "@media (max-width: 599px)": 132 },
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: colors.line,
    backgroundColor: colors.panel,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  pad: {
    height: 28,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    display: "flex",
    alignItems: "center",
    gap: 2,
    paddingBlock: 0,
    paddingInline: 6,
  },
  full: { display: { default: "inline", "@media (max-width: 599px)": "none" } },
  short: { display: { default: "none", "@media (max-width: 599px)": "inline" } },
  add: {
    fontSize: 11,
    paddingBlock: 2,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radii.sm,
    whiteSpace: "nowrap",
    cursor: "pointer",
    color: { default: colors.faint, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
  scroll: {
    overflow: "hidden",
    flexGrow: 1,
    minHeight: 0,
  },
});

/** Track header column; its scroll position is driven by the lanes via `scrollRef`. */
export function TrackHeaders({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const tracks = useEditor((s) => s.project.tracks);
  const commit = useEditor((s) => s.commit);
  return (
    <div {...stylex.props(styles.heads)}>
      <div {...stylex.props(styles.pad)}>
        {ADDABLE.map(({ kind, label, short, title }) => (
          <button
            key={kind}
            type="button"
            title={title}
            aria-label={title}
            onClick={() => commit((p) => addTrack(p, kind, newId()).project)}
            {...stylex.props(styles.add)}
          >
            <span {...stylex.props(styles.full)}>{label}</span>
            <span {...stylex.props(styles.short)}>{short}</span>
          </button>
        ))}
      </div>
      <div ref={scrollRef} {...stylex.props(styles.scroll)}>
        {tracks.map((t) => (
          <TrackHeader key={t.id} track={t} />
        ))}
      </div>
    </div>
  );
}
