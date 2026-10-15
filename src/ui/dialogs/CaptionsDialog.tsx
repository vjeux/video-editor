import * as stylex from "@stylexjs/stylex";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { clipWithSound, generateCaptions } from "../../app/captions";
import { reportError } from "../../app/errors";
import {
  CAPTION_MODELS,
  type CaptionModel,
  type TranscribeProgress,
} from "../../engine/transcriber";
import type { Id } from "../../core/types";
import { useEditor } from "../../store";
import { Button } from "../controls/Button";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { Toggle } from "../controls/Toggle";
import { CAPTION_PRESETS } from "../inspector/options";
import { colors } from "../theme/tokens.stylex";
import { BASE_CAPTION_OPTIONS, CAPTION_LANGUAGES, WORDS_PER_CAPTION } from "./caption-options";
import { Dialog } from "./Dialog";
import { DialogField } from "./DialogField";
import { TaskProgress } from "./TaskProgress";

const MODEL_OPTIONS = (Object.keys(CAPTION_MODELS) as CaptionModel[]).map((value) => ({
  value,
  label: CAPTION_MODELS[value].label,
}));

const styles = stylex.create({
  pair: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 },
  toggles: { display: "flex", flexWrap: "wrap", gap: 18 },
  toggle: { display: "flex", alignItems: "center", gap: 8, color: colors.muted, fontSize: 12 },
  hint: { margin: 0, color: colors.faint, fontSize: 11.5, lineHeight: 1.6 },
});

const statusOf = (p: TranscribeProgress) =>
  p.stage === "loading"
    ? p.progress > 0 && p.progress < 1
      ? `Downloading the speech model… ${Math.round(p.progress * 100)}%`
      : "Loading the speech model…"
    : `Transcribing… ${Math.round(p.progress * 100)}%`;

/**
 * Auto-captions for one clip: pick a look, how many words show at once and
 * the language, then transcribe on this device. Closing cancels.
 */
export function CaptionsDialog({ clipId, onClose }: { clipId: Id; onClose: () => void }) {
  const clipName = useEditor((s) => {
    const clip = clipWithSound(s.project, clipId);
    return clip ? (s.project.assets[clip.assetId]?.name ?? "clip") : null;
  });
  const [lookName, setLookName] = useState("Hormozi");
  const [maxWords, setMaxWords] = useState<string>("3");
  const [language, setLanguage] = useState<string>("en");
  const [model, setModel] = useState<CaptionModel>("fast");
  const [uppercase, setUppercase] = useState(false);
  const [stripPunctuation, setStripPunctuation] = useState(false);
  const [progress, setProgress] = useState<TranscribeProgress>({ stage: "loading", progress: 0 });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const [, dispatch, running] = useActionState<null, "generate">(async () => {
    const preset = CAPTION_PRESETS.find((p) => p.name === lookName);
    if (!preset) return null;
    const controller = new AbortController();
    abort.current = controller;
    setProgress({ stage: "loading", progress: 0 });
    try {
      const added = await generateCaptions(
        {
          clipId,
          model,
          language,
          look: { style: preset.style, textMotion: preset.textMotion, karaoke: preset.karaoke },
          options: {
            ...BASE_CAPTION_OPTIONS,
            maxWords: Number(maxWords),
            uppercase,
            stripPunctuation,
          },
        },
        { signal: controller.signal, onProgress: setProgress },
      );
      if (added > 0) onClose();
    } catch (error) {
      if (!controller.signal.aborted) reportError(error);
    }
    return null;
  }, null);

  if (clipName === null) return null;
  return (
    <Dialog
      title="Generate captions"
      onClose={onClose}
      dismissable={!running}
      note="Runs on this device"
      footer={
        running ? (
          <Button variant="danger" onClick={() => abort.current?.abort()}>
            Cancel
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => startTransition(() => dispatch("generate"))}>
              Generate captions
            </Button>
          </>
        )
      }
    >
      <p {...stylex.props(styles.hint)}>
        Transcribes the speech in <b>{clipName}</b> and adds a timed caption per phrase on a new
        Captions track, with karaoke following every spoken word.
      </p>
      <div {...stylex.props(styles.pair)}>
        <DialogField label="Look">
          <Select
            label="Caption look"
            value={lookName}
            disabled={running}
            options={CAPTION_PRESETS.map((p) => ({ value: p.name, label: p.name }))}
            onChange={setLookName}
          />
        </DialogField>
        <DialogField label="Language">
          <Select
            label="Spoken language"
            value={language}
            disabled={running}
            options={CAPTION_LANGUAGES}
            onChange={setLanguage}
          />
        </DialogField>
      </div>
      <DialogField label="Words on screen">
        <Segmented
          label="Words per caption"
          value={maxWords}
          options={WORDS_PER_CAPTION}
          onChange={setMaxWords}
        />
      </DialogField>
      <DialogField label="Speech model">
        <Segmented label="Speech model" value={model} options={MODEL_OPTIONS} onChange={setModel} />
      </DialogField>
      <div {...stylex.props(styles.toggles)}>
        <span {...stylex.props(styles.toggle)}>
          <Toggle label="Uppercase captions" on={uppercase} onChange={setUppercase} />
          UPPERCASE
        </span>
        <span {...stylex.props(styles.toggle)}>
          <Toggle label="Remove punctuation" on={stripPunctuation} onChange={setStripPunctuation} />
          No punctuation
        </span>
      </div>
      {running ? (
        <TaskProgress
          label="Caption progress"
          progress={progress.progress}
          status={statusOf(progress)}
        />
      ) : (
        <p {...stylex.props(styles.hint)}>
          The {CAPTION_MODELS[model].label.toLowerCase()} model downloads once (
          {CAPTION_MODELS[model].size}) and is cached; nothing leaves your device.
        </p>
      )}
    </Dialog>
  );
}
