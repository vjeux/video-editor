import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { attachViewer } from "../../app/playback";
import { editorStore, useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { PanelHeader } from "../controls/PanelHeader";
import { Select } from "../controls/Select";
import { FORMAT_PRESETS } from "../formats";
import { colors, radii, shadows } from "../theme/tokens.stylex";
import { SafeArea } from "./SafeArea";
import { SelectionOverlay } from "./SelectionOverlay";
import { Transport } from "./Transport";

const STAGE_PAD = 16;

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
  empty: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    pointerEvents: "none",
    color: colors.faint,
    fontSize: 12,
    lineHeight: 1.7,
  },
  emptyTitle: {
    display: "block",
    marginBottom: 2,
    color: colors.muted,
    fontSize: 14,
    fontWeight: 600,
  },
});

export function Viewer() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useEditor((s) => s.project.settings);
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
    c.width = Math.round(Math.min(settings.width, rect.width * dpr));
    c.height = Math.round(c.width * (settings.height / settings.width));
  }, [rect.width, settings.width, settings.height]);

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
      <PanelHeader title="Program">
        <Select
          compact
          label="Canvas format"
          value={preset?.label ?? "custom"}
          onChange={changeFormat}
        >
          {!preset && (
            <option value="custom">
              Custom · {settings.width}×{settings.height}
            </option>
          )}
          {FORMAT_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </Select>
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
          {...stylex.props(styles.frame, styles.rect(rect.left, rect.top, rect.width, rect.height))}
        >
          <canvas ref={canvas} {...stylex.props(styles.canvas)} />
          {safe && <SafeArea />}
        </div>
        <SelectionOverlay
          left={rect.left}
          top={rect.top}
          width={rect.width}
          height={rect.height}
          scale={rect.width / settings.width}
        />
        {isEmpty && (
          <div {...stylex.props(styles.empty)}>
            <div>
              <b {...stylex.props(styles.emptyTitle)}>Nothing on the timeline yet</b>
              Drop media into the bin, then drag it onto a track.
            </div>
          </div>
        )}
      </div>
      <Transport onFullscreen={() => void stage.current?.requestFullscreen()} />
    </main>
  );
}
