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
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    paddingBlock: 0,
    paddingInline: 14,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
    backgroundColor: colors.panel,
  },
  controls: { display: "flex", alignItems: "center", gap: 4 },
  play: {
    width: 38,
    height: 38,
    padding: 0,
    marginBlock: 0,
    marginInline: 6,
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
    display: "flex",
    alignItems: "center",
    gap: 8,
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
        <IconButton icon="start" title="Go to start (Home)" onClick={goToStart} />
        <IconButton icon="prev" title="Previous frame (←)" onClick={() => stepFrames(-1)} />
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
        <IconButton icon="next" title="Next frame (→)" onClick={() => stepFrames(1)} />
        <IconButton icon="end" title="Go to end (End)" onClick={goToEnd} />
        <IconButton
          icon="loop"
          title="Loop playback (L)"
          on={loop}
          onClick={() => setView({ loop: !loop })}
        />
      </div>
      <div {...stylex.props(styles.right)}>
        <IconButton
          icon={volume > 0 ? "volume" : "mute"}
          title={volume > 0 ? "Mute preview" : "Unmute preview"}
          onClick={() => setView({ monitorVolume: volume > 0 ? 0 : 1 })}
        />
        <Range
          tone="mono"
          label="Preview volume"
          value={volume}
          min={0}
          max={1}
          onChange={(v) => setView({ monitorVolume: v })}
        />
        <IconButton icon="fullscreen" title="Fullscreen" onClick={onFullscreen} />
      </div>
    </div>
  );
}
