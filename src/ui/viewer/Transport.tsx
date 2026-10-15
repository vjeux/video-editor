import * as stylex from "@stylexjs/stylex";
import { goToEnd, goToStart, stepFrames } from "../../app/commands";
import { togglePlay } from "../../app/playback";
import { useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { Range } from "../controls/Range";
import { colors } from "../theme/tokens.stylex";
import { Timecode } from "./Timecode";

const styles = stylex.create({
  transport: {
    height: 56,
    flexShrink: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: 8,
    paddingBlock: 0,
    paddingInline: { default: 14, "@container transport (max-width: 480px)": 8 },
    containerName: "transport",
    containerType: "inline-size",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
    backgroundColor: colors.panel,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: { default: 4, "@container transport (max-width: 480px)": 0 },
  },
  /** Jump-to-start/end and loop: first to go when space runs out. */
  secondary: {
    display: { default: "contents", "@container transport (max-width: 560px)": "none" },
  },
  /** Frame stepping survives longer than jumps. */
  stepping: {
    display: { default: "contents", "@container transport (max-width: 360px)": "none" },
  },
  /** The volume slider collapses to just the mute button. */
  slider: {
    display: { default: "flex", "@container transport (max-width: 720px)": "none" },
    width: 90,
  },
  play: {
    width: { default: 38, "@container transport (max-width: 480px)": 34 },
    height: { default: 38, "@container transport (max-width: 480px)": 34 },
    flexShrink: 0,
    padding: 0,
    marginBlock: 0,
    marginInline: { default: 6, "@container transport (max-width: 480px)": 4 },
    borderWidth: 0,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: colors.bg,
    backgroundColor: { default: colors.text, ":hover": "#fff" },
  },
  right: {
    justifySelf: "end",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: { default: 8, "@container transport (max-width: 480px)": 2 },
    color: colors.muted,
  },
});

export function Transport({ onFullscreen }: { onFullscreen: () => void }) {
  const playing = useEditor((s) => s.playing);
  const loop = useEditor((s) => s.loop);
  const volume = useEditor((s) => s.monitorVolume);
  const setView = useEditor((s) => s.setView);
  return (
    <div {...stylex.props(styles.transport)}>
      <Timecode />
      <div {...stylex.props(styles.controls)}>
        <span {...stylex.props(styles.secondary)}>
          <IconButton icon="start" title="Go to start (Home)" onClick={goToStart} />
        </span>
        <span {...stylex.props(styles.stepping)}>
          <IconButton icon="prev" title="Previous frame (←)" onClick={() => stepFrames(-1)} />
        </span>
        <button
          type="button"
          title={playing ? "Pause (Space)" : "Play (Space)"}
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
          {...stylex.props(styles.play)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4l13 8-13 8z"} />
          </svg>
        </button>
        <span {...stylex.props(styles.stepping)}>
          <IconButton icon="next" title="Next frame (→)" onClick={() => stepFrames(1)} />
        </span>
        <span {...stylex.props(styles.secondary)}>
          <IconButton icon="end" title="Go to end (End)" onClick={goToEnd} />
          <IconButton
            icon="loop"
            title="Loop playback (L)"
            on={loop}
            onClick={() => setView({ loop: !loop })}
          />
        </span>
      </div>
      <div {...stylex.props(styles.right)}>
        <IconButton
          icon={volume > 0 ? "volume" : "mute"}
          title={volume > 0 ? "Mute preview" : "Unmute preview"}
          onClick={() => setView({ monitorVolume: volume > 0 ? 0 : 1 })}
        />
        <span {...stylex.props(styles.slider)}>
          <Range
            tone="mono"
            label="Preview volume"
            value={volume}
            min={0}
            max={1}
            onChange={(v) => setView({ monitorVolume: v })}
          />
        </span>
        <IconButton icon="fullscreen" title="Fullscreen" onClick={onFullscreen} />
      </div>
    </div>
  );
}
