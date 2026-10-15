import {
  addCaptions,
  chunkCaptions,
  wordsOnTimeline,
  type CaptionLook,
  type CaptionOptions,
} from "../core/captions";
import { sourceTimeAt } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";
import { transcribe, type CaptionModel, type TranscribeProgress } from "../engine/transcriber";
import { editorStore } from "../store";
import { noticeStore } from "../store/notices";
import { media, newId } from "./engine";

const state = () => editorStore.getState();

export interface CaptionRequest {
  clipId: Id;
  model: CaptionModel;
  language: string;
  look: CaptionLook;
  options: CaptionOptions;
}

/** A media clip that carries sound (what captions and silence removal work on). */
export function clipWithSound(project: Project, clipId: Id): MediaClip | null {
  const clip = project.clips[clipId];
  return clip?.type === "media" && project.assets[clip.assetId]?.hasAudio ? clip : null;
}

/**
 * Transcribes the clip's audio on this device and adds one timed title per
 * caption on a new Captions track, as a single undo step.
 */
export async function generateCaptions(
  request: CaptionRequest,
  { signal, onProgress }: { signal: AbortSignal; onProgress: (p: TranscribeProgress) => void },
): Promise<number> {
  const clip = clipWithSound(state().project, request.clipId);
  if (!clip) throw new Error("Captions need a clip with sound");
  const audio = await media.audioBuffer(clip.assetId);
  if (!audio) throw new Error("This clip's audio could not be decoded");

  const range = {
    from: sourceTimeAt(clip, clip.start),
    to: sourceTimeAt(clip, clip.start + clip.duration),
  };
  const words = await transcribe(audio, range, {
    model: request.model,
    language: request.language,
    signal,
    onProgress,
  });
  // The clip may have moved while transcribing: place words where it is now.
  const current = clipWithSound(state().project, request.clipId) ?? clip;
  const chunks = chunkCaptions(wordsOnTimeline(current, words), request.options);
  if (chunks.length === 0) {
    noticeStore.getState().push("info", "No speech found in this clip");
    return 0;
  }
  state().commit((p) => addCaptions(p, chunks, request.look, newId).project);
  noticeStore.getState().push("info", `Added ${chunks.length} captions`);
  return chunks.length;
}
