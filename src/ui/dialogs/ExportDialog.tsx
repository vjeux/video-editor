import * as stylex from "@stylexjs/stylex";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { media } from "../../app/engine";
import { reportError } from "../../app/errors";
import { canStreamToFile, chooseSaveFile } from "../../app/save-file";
import { formatFps, formatTimecode } from "../../core/time";
import { projectDuration } from "../../core/timeline";
import type { Project } from "../../core/types";
import {
  encodableFormats,
  EXPORT_FORMATS,
  exportFileName,
  exportProject,
  type ExportFormat,
  type ExportQuality,
} from "../../engine/export";
import { editorStore, useEditor } from "../../store";
import { Button } from "../controls/Button";
import { Icon } from "../controls/Icon";
import { Select } from "../controls/Select";
import { surfaces } from "../controls/surfaces";
import { colors, radii } from "../theme/tokens.stylex";
import { Dialog } from "./Dialog";
import { DialogField } from "./DialogField";
import { ExportProgress } from "./ExportProgress";
import { ExportSummary } from "./ExportSummary";
import { FormatPicker } from "./FormatPicker";

const QUALITY_OPTIONS: readonly { value: ExportQuality; label: string }[] = [
  { value: "low", label: "Small file" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "High · Recommended" },
  { value: "very-high", label: "Maximum" },
];

const QUALITY_HINTS: Record<ExportQuality, string> = {
  low: "Compact files for quick previews and sharing.",
  medium: "A balance of image detail and file size.",
  high: "Crisp detail for a finished video.",
  "very-high": "The most detail, with a larger file size.",
};

interface OutputDetails {
  filename: string;
  resolution: string;
  duration: string;
  frameRate: string;
}

type Result =
  | { kind: "idle" }
  /** `saved`: streamed into a file the user chose; otherwise held for download. */
  | { kind: "done"; url: string; size: number; details: OutputDetails; saved: boolean };

type Command =
  | {
      type: "export";
      format: ExportFormat;
      quality: ExportQuality;
      height: number;
      filename: string;
      destination: FileSystemFileHandle | null;
    }
  | { type: "reset" };

interface Progress {
  progress: number;
  eta: number | null;
}

const IDLE: Result = { kind: "idle" };

const formatBytes = (bytes: number) =>
  bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(2)} GB`
    : bytes >= 1e6
      ? `${(bytes / 1e6).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

/** Past this, an export built in memory (no save picker) risks not fitting. */
const LONG_IN_MEMORY_EXPORT = 15 * 60;

function outputDetails(project: Project, height: number, filename: string): OutputDetails {
  const h = Math.max(2, Math.round(height / 2) * 2);
  const w = Math.max(
    2,
    Math.round(((project.settings.width / project.settings.height) * h) / 2) * 2,
  );
  return {
    filename,
    resolution: `${w} × ${h}`,
    duration: formatTimecode(projectDuration(project), project.settings.fps),
    frameRate: `${formatFps(project.settings.fps)} fps`,
  };
}

const styles = stylex.create({
  content: { display: "grid", gap: 22, paddingTop: 2, paddingBottom: 4 },
  intro: { margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.7 },
  output: {
    display: "grid",
    gap: 16,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  file: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  fileIcon: {
    width: 40,
    height: 44,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.md,
    color: colors.accent2,
    backgroundColor: colors.accentSoft,
  },
  fileText: { display: "grid", gap: 5, minWidth: 0, flexGrow: 1 },
  eyebrow: { color: colors.muted, fontSize: 11 },
  filename: { fontSize: 13, fontWeight: 600, overflowWrap: "anywhere", userSelect: "text" },
  filenameField: { display: "flex", alignItems: "center", height: 36, overflow: "hidden" },
  filenameInput: {
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    height: "100%",
    paddingInline: 10,
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: colors.text,
    fontSize: 13,
    fontWeight: 500,
  },
  extension: { flexShrink: 0, paddingRight: 10, color: colors.muted, fontSize: 12 },
  settings: { display: "grid", gap: 20 },
  row: {
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", "@media (max-width: 449px)": "1fr" },
    gap: 16,
  },
  field: { minWidth: 0, display: "grid", gap: 7, alignContent: "start" },
  result: { display: "grid", gap: 12 },
  ready: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: colors.audio,
    fontSize: 13,
    fontWeight: 550,
  },
  video: {
    width: "100%",
    maxHeight: 260,
    borderRadius: radii.lg,
    backgroundColor: "#000",
  },
  hint: { margin: 0, color: colors.muted, fontSize: 11, lineHeight: 1.6 },
  privacy: {
    display: { default: "flex", "@media (max-width: 449px)": "none" },
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: colors.muted,
  },
});

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project);
  const { settings } = project;
  const duration = projectDuration(project);
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [filenameDraft, setFilenameDraft] = useState<string | null>(null);
  const filenameId = useId();
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [chosenHeight, setHeight] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ progress: 0, eta: null });
  const [supported, setSupported] = useState<Record<ExportFormat, boolean> | null>(null);
  const [activeOutput, setActiveOutput] = useState<OutputDetails | null>(null);
  const abort = useRef<AbortController | null>(null);
  const height = chosenHeight ?? settings.height;
  const filename = exportFileName(project, format, filenameDraft ?? project.name);
  const filenameBase = filename.slice(0, -(format.length + 1));

  useEffect(() => {
    let active = true;
    encodableFormats()
      .then((formats) => {
        if (!active) return;
        setSupported(formats);
        setFormat((current) => (formats[current] ? current : formats.mp4 ? "mp4" : "webm"));
      })
      .catch((error) => {
        if (!active) return;
        setSupported({ mp4: false, webm: false });
        reportError(error);
      });
    return () => {
      active = false;
    };
  }, []);

  /**
   * The export is a React action: `exporting` is its pending flag, progress
   * streams in through plain state updates, and the result (or reset) is the
   * action state. No unmount abort: when the dialog is hidden by <Activity>
   * the export keeps running in the background.
   */
  const [result, dispatch, exporting] = useActionState<Result, Command>(
    async (previous, command) => {
      if (previous.kind === "done") URL.revokeObjectURL(previous.url);
      if (command.type === "reset") return IDLE;
      const controller = new AbortController();
      abort.current = controller;
      const startedAt = performance.now();
      setProgress({ progress: 0, eta: null });
      const source = editorStore.getState().project;
      const details = outputDetails(
        source,
        command.height,
        command.destination?.name ?? command.filename,
      );
      setActiveOutput(details);
      try {
        const result = await exportProject(source, media, {
          ...command,
          signal: controller.signal,
          onProgress: (p) => {
            const elapsed = (performance.now() - startedAt) / 1000;
            setProgress({ progress: p, eta: p > 0.02 ? elapsed * ((1 - p) / p) : null });
          },
        });
        // A saved file previews straight from disk.
        const file = result.kind === "blob" ? result.blob : await command.destination!.getFile();
        return {
          kind: "done",
          url: URL.createObjectURL(file),
          size: file.size,
          details,
          saved: result.kind === "file",
        };
      } catch (error) {
        reportError(error);
        return IDLE;
      }
    },
    IDLE,
  );

  const run = (command: Command) => startTransition(() => dispatch(command));
  const start = async () => {
    try {
      const destination = await chooseSaveFile(filename, {
        description: EXPORT_FORMATS[format].label,
        mimeType: EXPORT_FORMATS[format].mimeType,
      });
      run({ type: "export", format, quality, height, filename, destination });
    } catch (error) {
      reportError(error);
    }
  };
  const inMemoryWarning = !canStreamToFile() && duration > LONG_IN_MEMORY_EXPORT;
  const heights = [...new Set([settings.height, 2160, 1440, 1080, 720, 480])]
    .filter((h) => h <= Math.max(settings.height, 2160))
    .sort((a, b) => b - a);
  const width = (h: number) => Math.round(((settings.width / settings.height) * h) / 2) * 2;
  const output =
    result.kind === "done"
      ? result.details
      : exporting && activeOutput
        ? activeOutput
        : outputDetails(project, height, filename);

  const footer =
    result.kind === "done" ? (
      <>
        <Button size="large" onClick={() => run({ type: "reset" })}>
          Export again
        </Button>
        {result.saved ? (
          <Button size="large" variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Button
            size="large"
            variant="primary"
            href={result.url}
            download={result.details.filename}
          >
            <Icon name="export" size={15} />
            Download video
          </Button>
        )}
      </>
    ) : exporting ? (
      <>
        <Button size="large" onClick={onClose} title="Keep exporting in the background">
          Hide window
        </Button>
        <Button size="large" variant="danger" onClick={() => abort.current?.abort()}>
          Cancel export
        </Button>
      </>
    ) : (
      <>
        <Button size="large" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="large"
          variant="primary"
          onClick={() => void start()}
          disabled={duration <= 0 || !supported?.[format]}
        >
          <Icon name="export" size={15} />
          Export {format.toUpperCase()}
        </Button>
      </>
    );

  return (
    <Dialog
      title="Export video"
      size="export"
      onClose={onClose}
      note={
        <span {...stylex.props(styles.privacy)}>
          <Icon name="lock" size={12} />
          Exported on your device
        </span>
      }
      footer={footer}
    >
      <div {...stylex.props(styles.content)}>
        <p {...stylex.props(styles.intro)}>
          {result.kind === "done"
            ? result.saved
              ? "Your video is saved. Preview it below."
              : "Your video is ready. Preview it below, then save it to your device."
            : exporting
              ? "Turning your timeline into a finished video."
              : "Choose the format and quality for your finished video."}
        </p>
        <section aria-label="Output file" {...stylex.props(styles.output)}>
          <div {...stylex.props(styles.file)}>
            <span {...stylex.props(styles.fileIcon)}>
              <Icon name="film" size={22} strokeWidth={1.5} />
            </span>
            <div {...stylex.props(styles.fileText)}>
              {result.kind === "idle" && !exporting ? (
                <>
                  <label htmlFor={filenameId} {...stylex.props(styles.eyebrow)}>
                    File name
                  </label>
                  <div {...stylex.props(surfaces.well, styles.filenameField)}>
                    <input
                      id={filenameId}
                      type="text"
                      value={filenameDraft ?? filenameBase}
                      placeholder="export"
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(e) => setFilenameDraft(e.target.value)}
                      onBlur={() => setFilenameDraft(filenameBase)}
                      {...stylex.props(styles.filenameInput)}
                    />
                    <span {...stylex.props(styles.extension)}>.{format}</span>
                  </div>
                </>
              ) : (
                <>
                  <span {...stylex.props(styles.eyebrow)}>
                    {result.kind === "done"
                      ? `${formatBytes(result.size)} · ${result.saved ? "Saved" : "Ready to download"}`
                      : "Output file"}
                  </span>
                  <span {...stylex.props(styles.filename)}>{output.filename}</span>
                </>
              )}
            </div>
          </div>
          <ExportSummary
            items={[
              { label: "Resolution", value: output.resolution },
              { label: "Duration", value: output.duration },
              { label: "Frame rate", value: output.frameRate },
            ]}
          />
        </section>
        {result.kind === "done" ? (
          <div {...stylex.props(styles.result)}>
            <div role="status" {...stylex.props(styles.ready)}>
              <Icon name="check" size={16} />
              Export complete
            </div>
            <video
              aria-label="Exported video preview"
              src={result.url}
              controls
              {...stylex.props(styles.video)}
            />
          </div>
        ) : exporting ? (
          <ExportProgress progress={progress.progress} eta={progress.eta} />
        ) : (
          <div {...stylex.props(styles.settings)}>
            <DialogField label="Format">
              <FormatPicker value={format} onChange={setFormat} supported={supported} />
              {!supported && (
                <p role="status" {...stylex.props(styles.hint)}>
                  Checking available formats…
                </p>
              )}
              {inMemoryWarning && (
                <p role="note" {...stylex.props(styles.hint)}>
                  This browser builds the video in memory before you can download it, so a long
                  export may run out. Chrome and Edge save straight to disk instead.
                </p>
              )}
              {supported && !supported.mp4 && !supported.webm && (
                <p role="alert" {...stylex.props(styles.hint)}>
                  Video export is unavailable in this browser. Try another browser with video
                  encoding support.
                </p>
              )}
            </DialogField>
            <div {...stylex.props(styles.row)}>
              <div {...stylex.props(styles.field)}>
                <DialogField label="Resolution">
                  <Select
                    label="Resolution"
                    value={String(height)}
                    options={heights.map((h) => ({
                      value: String(h),
                      label:
                        h === settings.height
                          ? `Original · ${width(h)} × ${h}`
                          : `${width(h)} × ${h}`,
                    }))}
                    onChange={(v) => setHeight(Number(v))}
                  />
                </DialogField>
                <p {...stylex.props(styles.hint)}>
                  {height > settings.height
                    ? "Upscaled from your project. No extra detail is added."
                    : "Keeps your project’s aspect ratio."}
                </p>
              </div>
              <div {...stylex.props(styles.field)}>
                <DialogField label="Quality">
                  <Select
                    label="Quality"
                    value={quality}
                    options={QUALITY_OPTIONS}
                    onChange={setQuality}
                  />
                </DialogField>
                <p {...stylex.props(styles.hint)}>{QUALITY_HINTS[quality]}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
