import {
  detectSilences,
  LevelStream,
  removeSpans,
  silencesInClip,
  spansLength,
  suggestThreshold,
  type SilenceOptions,
  type Span,
} from "../core/silences";
import type { Id } from "../core/types";
import { editorStore } from "../store";
import { noticeStore } from "../store/notices";
import { silenceStore } from "../store/silences";
import { clipWithSound } from "./captions";
import { media, newId } from "./engine";

/** Envelope resolution: fine enough to land cuts between words. */
const FRAME = 0.01;

const state = () => editorStore.getState();
const envelopes = new Map<Id, Promise<Float32Array>>();

async function scanLevels(assetId: Id): Promise<Float32Array> {
  let stream = null as LevelStream | null;
  const found = await media.scanAudio(assetId, (channels, at, sampleRate) => {
    stream ??= new LevelStream(sampleRate, FRAME);
    stream.add(channels, at);
  });
  const levels = stream?.levels();
  if (!found || !levels) throw new Error("This clip's audio could not be decoded");
  return levels;
}

/**
 * The asset's level envelope, streamed once per file (a few hundred KB an
 * hour) without holding its decoded sound.
 */
function levelsOf(assetId: Id): Promise<Float32Array> {
  let levels = envelopes.get(assetId);
  if (!levels) {
    levels = scanLevels(assetId);
    envelopes.set(assetId, levels);
    levels.catch(() => envelopes.delete(assetId));
  }
  return levels;
}

export const DEFAULT_SILENCE: Omit<SilenceOptions, "threshold"> = {
  minSilence: 0.5,
  padding: 0.12,
};

/** A threshold suited to this clip's recording. */
export async function suggestedThreshold(clipId: Id): Promise<number> {
  const clip = clipWithSound(state().project, clipId);
  if (!clip) throw new Error("Silence removal needs a clip with sound");
  return suggestThreshold(await levelsOf(clip.assetId));
}

/** Finds the clip's silences with `options` and shows them on the timeline. */
export async function previewSilences(clipId: Id, options: SilenceOptions): Promise<Span[]> {
  const clip = clipWithSound(state().project, clipId);
  if (!clip) throw new Error("Silence removal needs a clip with sound");
  const spans = silencesInClip(clip, detectSilences(await levelsOf(clip.assetId), FRAME, options));
  silenceStore.getState().show({ clipId, options, spans });
  return spans;
}

/** Selects the clip and previews its silences at a threshold suited to it. */
export async function findSilences(clipId: Id): Promise<void> {
  state().select([clipId]);
  await previewSilences(clipId, {
    ...DEFAULT_SILENCE,
    threshold: await suggestedThreshold(clipId),
  });
}

export const clearSilences = () => silenceStore.getState().clear();

/** Cuts the previewed silences out of the clip as one undo step. */
export function removePreviewedSilences() {
  const preview = silenceStore.getState().preview;
  if (!preview || preview.spans.length === 0) return;
  const { project, commit } = state();
  const clip = project.clips[preview.clipId];
  if (!clip || project.tracks.find((t) => t.id === clip.trackId)?.locked) {
    throw new Error("Unlock the track to remove silences");
  }
  commit((p) => removeSpans(p, preview.clipId, preview.spans, newId));
  silenceStore.getState().clear();
  const seconds = spansLength(preview.spans).toFixed(1);
  noticeStore
    .getState()
    .push("info", `Removed ${preview.spans.length} pauses · ${seconds}s shorter`);
}
