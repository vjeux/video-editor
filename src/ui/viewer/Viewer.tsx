import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { attachViewer } from "../../app/playback";
import { editorStore, useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { PanelHeader } from "../controls/PanelHeader";
import { Select } from "../controls/Select";
import { FORMAT_PRESETS } from "../formats";
import { colors, radii, shadows } from "../theme/tokens.stylex";
import { PerfOverlay } from "./PerfOverlay";
import { SHOW_PERF } from "./perf-flag";
import { SafeArea } from "./SafeArea";
import { SelectionOverlay } from "./SelectionOverlay";
import { Transport } from "./Transport";
import { EmptyPreview } from "./EmptyPreview";

const STAGE_PAD = 16;

/** Upper bound for the preview canvas width in device pixels. */
const MAX_PREVIEW_WIDTH = 3840;
/**
 * While playing, frames change 30–60 times a second and sources decode at
 * ≤1280 px: rendering wider only multiplies fill, effect and upload cost.
 * Paused, the monitor goes back to full device resolution for crisp stills.
 */
const PLAYBACK_MAX_WIDTH = 1920;

const styles = stylex.create({
  viewer: {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.stage,
  },
  stage: {
    position: "relative",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    containerName: "preview",
    containerType: "size",
  },
  frame: {
    position: "absolute",
    overflow: "hidden",
    borderRadius: radii.sm,
    boxShadow: shadows.frame,
    backgroundColor: "#000",
  },
  rect: (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
  }),
  canvas: { display: "block", width: "100%", height: "100%" },
  emptyFrame: { visibility: "hidden" },
});

export function Viewer() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useEditor((s) => s.project.settings);
  const playing = useEditor((s) => s.playing);
  const isEmpty = useEditor((s) => Object.keys(s.project.clips).length === 0);
  const commit = useEditor((s) => s.commit);
  const [safe, setSafe] = useState(false);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - STAGE_PAD * 2;
      const h = el.clientHeight - STAGE_PAD * 2;
      const { width, height } = editorStore.getState().project.settings;
      const s = Math.max(0, Math.min(w / width, h / height));
      setRect({
        width: width * s,
        height: height * s,
        left: (el.clientWidth - width * s) / 2,
        top: (el.clientHeight - height * s) / 2,
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    const unsubscribe = editorStore.subscribe((s, prev) => {
      if (s.project.settings !== prev.project.settings) fit();
    });
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    // Render at the display's device pixels (not the project width) so text and
    // vector shapes stay crisp on HiDPI screens; capped at 4K for memory.
    const cap = playing ? PLAYBACK_MAX_WIDTH : MAX_PREVIEW_WIDTH;
    const width = Math.round(Math.min(cap, rect.width * dpr));
    const height = Math.round(width * (settings.height / settings.width));
    // Assigning a canvas dimension clears it even when the value is unchanged,
    // and the render loop only redraws on real size changes: touch only on change.
    if (c.width !== width) c.width = width;
    if (c.height !== height) c.height = height;
  }, [rect.width, settings.width, settings.height, playing]);

  useEffect(() => {
    const c = canvas.current;
    return c ? attachViewer(c) : undefined;
  }, []);

  const preset = FORMAT_PRESETS.find(
    (p) => p.width === settings.width && p.height === settings.height,
  );

  const changeFormat = (label: string) => {
    const next = FORMAT_PRESETS.find((p) => p.label === label);
    if (next)
      commit((p) => ({
        ...p,
        settings: { ...p.settings, width: next.width, height: next.height },
      }));
  };

  return (
    <main aria-label="Viewer" {...stylex.props(styles.viewer)}>
      <PanelHeader title="Preview" icon="film">
        <Select
          compact
          label="Canvas format"
          value={preset?.label ?? "custom"}
          options={[
            ...(preset
              ? []
              : [{ value: "custom", label: `Custom · ${settings.width}×${settings.height}` }]),
            ...FORMAT_PRESETS.map((p) => ({ value: p.label, label: p.label })),
          ]}
          onChange={changeFormat}
        />
        <IconButton
          icon="safe"
          title="Safe areas"
          on={safe}
          onClick={() => setSafe(!safe)}
          size={15}
        />
      </PanelHeader>
      <div ref={stage} {...stylex.props(styles.stage)}>
        <div
          {...stylex.props(
            styles.frame,
            styles.rect(rect.left, rect.top, rect.width, rect.height),
            isEmpty && styles.emptyFrame,
          )}
        >
          <canvas ref={canvas} {...stylex.props(styles.canvas)} />
          {safe && <SafeArea />}
          {SHOW_PERF && <PerfOverlay />}
        </div>
        <SelectionOverlay
          left={rect.left}
          top={rect.top}
          width={rect.width}
          height={rect.height}
          scale={rect.width / settings.width}
        />
        {isEmpty && <EmptyPreview />}
      </div>
      <Transport onFullscreen={() => void stage.current?.requestFullscreen()} />
    </main>
  );
}
