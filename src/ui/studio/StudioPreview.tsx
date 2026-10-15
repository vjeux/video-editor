import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { previewEffect, studioGpu } from "../../app/effects";
import type { EffectDefinition, Params } from "../../core/types";
import type { ShaderError } from "../../engine/gpu";
import { useEditor, useMedia } from "../../store";
import { IconButton } from "../controls/IconButton";
import { Range } from "../controls/Range";
import { Segmented } from "../controls/Segmented";
import { colors, fonts, radii } from "../theme/tokens.stylex";
import { ErrorBanner } from "./ErrorBanner";
import { useAnimationFrames } from "./hooks";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  previewFrames,
  selectedMediaAssetId,
} from "./preview-frames";

/** One play loop sweeps progress 0 → 1 in this many seconds. */
const LOOP_SECONDS = 2;

type FrameSource = "samples" | "clip";

const styles = stylex.create({
  preview: { display: "grid", gap: 8 },
  stage: {
    position: "relative",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.stage,
    backgroundImage:
      "repeating-conic-gradient(rgba(255, 255, 255, 0.03) 0% 25%, transparent 0% 50%)",
    backgroundSize: "16px 16px",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    transition: "opacity 0.2s, filter 0.2s",
  },
  stale: { opacity: 0.35, filter: "saturate(0.4)" },
  placeholder: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    paddingInline: 16,
    textAlign: "center",
    color: colors.faint,
    fontSize: 12,
  },
  transport: { display: "flex", alignItems: "center", gap: 6 },
  scrub: { flexGrow: 1, minWidth: 0, display: "grid" },
  readout: {
    flexShrink: 0,
    minWidth: 92,
    textAlign: "end",
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.muted,
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * The shader running over sample frames (or the selected clip's poster).
 * `def` is the last version that compiled; while `errors` exist it stays up, dimmed.
 */
export function StudioPreview({
  def,
  params,
  errors,
  onJump,
}: {
  def: EffectDefinition | null;
  params: Params;
  errors: readonly ShaderError[];
  onJump: (line: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0.5);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<FrameSource>("samples");
  const assetId = useEditor(selectedMediaAssetId);
  const poster = useMedia((s) => (assetId ? s.assets[assetId]?.poster : undefined));
  const shownPoster = source === "clip" ? poster : undefined;
  const supported = studioGpu() !== null;

  useAnimationFrames(playing, (seconds) => {
    setProgress((p) => (p + seconds / LOOP_SECONDS) % 1);
    setTime((t) => t + seconds);
  });

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !def) return;
    const [from, to] = previewFrames(shownPoster);
    // The GPU canvas is reused by the next render, so it is copied out right away.
    const frame = previewEffect(def, from, to, { progress, time, params }) ?? from;
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.drawImage(frame, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  }, [def, params, progress, time, shownPoster]);

  const placeholder = !supported
    ? "Live preview needs a browser with WebGL2"
    : !def
      ? "The preview appears once the shader compiles"
      : null;

  return (
    <section aria-label="Preview" {...stylex.props(styles.preview)}>
      <div {...stylex.props(styles.stage)}>
        <canvas
          ref={canvas}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          {...stylex.props(styles.canvas, (errors.length > 0 || !def) && styles.stale)}
        />
        {placeholder && <div {...stylex.props(styles.placeholder)}>{placeholder}</div>}
        {errors.length > 0 && <ErrorBanner errors={errors} onJump={onJump} />}
      </div>
      <div {...stylex.props(styles.transport)}>
        <IconButton
          icon={playing ? "pause" : "play"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
          disabled={!def}
          size={14}
        />
        <IconButton
          icon="start"
          title="Rewind"
          onClick={() => {
            setProgress(0);
            setTime(0);
          }}
          size={14}
          small
        />
        <div {...stylex.props(styles.scrub)}>
          <Range
            label="Progress"
            value={progress}
            min={0}
            max={1}
            step={0.001}
            onChange={setProgress}
          />
        </div>
        <span aria-label="Progress and time" {...stylex.props(styles.readout)}>
          {progress.toFixed(2)} · {time.toFixed(1)}s
        </span>
      </div>
      <Segmented<FrameSource>
        label="Preview source"
        value={poster ? source : "samples"}
        onChange={setSource}
        options={[
          { value: "samples", label: "Sample frames" },
          {
            value: "clip",
            label: "Selected clip",
            disabled: !poster,
            title: poster ? undefined : "Select a video or image clip on the timeline",
          },
        ]}
      />
    </section>
  );
}
