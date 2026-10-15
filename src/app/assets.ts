import { createMediaClip } from "../core/factories";
import { canPlace, placeClip, removeAsset, trackEnd } from "../core/timeline";
import { trackFor } from "../core/tracks";
import type { Asset, Id, Project } from "../core/types";
import { saveMedia } from "../engine/persistence";
import { editorStore, mediaStore } from "../store";
import { PEAKS_PER_SECOND } from "../store/media";
import { media, newId, player } from "./engine";
import { reportError } from "./errors";

const FILMSTRIP_HEIGHT = 72;
const POSTER_HEIGHT = 180;
const MAX_FILMSTRIP_FRAMES = 120;
const MAX_PROJECT_EDGE = 3840;

function computePeaks(buffer: AudioBuffer): Float32Array {
  const bucket = Math.max(1, Math.floor(buffer.sampleRate / PEAKS_PER_SECOND));
  const peaks = new Float32Array(Math.ceil(buffer.length / bucket));
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] ?? 0);
      const b = (i / bucket) | 0;
      if (v > (peaks[b] ?? 0)) peaks[b] = v;
    }
  }
  return peaks;
}

/** Builds posters, filmstrips and waveforms after a file is decodable. */
async function hydrate(asset: Asset) {
  const { patch } = mediaStore.getState();
  if (asset.kind !== "audio") {
    const duration = asset.duration ?? 0;
    const [poster] = await media.thumbnails(asset.id, [Math.min(1, duration / 2)], POSTER_HEIGHT);
    patch(asset.id, { status: "ready", poster });
    const interval = duration > 0 ? Math.max(0.25, duration / MAX_FILMSTRIP_FRAMES) : Infinity;
    const times =
      duration > 0
        ? Array.from({ length: Math.ceil(duration / interval) }, (_, i) => i * interval)
        : [0];
    patch(asset.id, {
      filmstrip: { interval, frames: await media.thumbnails(asset.id, times, FILMSTRIP_HEIGHT) },
    });
  } else {
    patch(asset.id, { status: "ready" });
  }
  if (asset.hasAudio) {
    const buffer = await media.audioBuffer(asset.id);
    if (buffer) patch(asset.id, { peaks: computePeaks(buffer) });
  }
}

/** Decodes an asset's stored file into the media library (import or session restore). */
export async function openAsset(asset: Asset, file: Blob) {
  try {
    await media.load(asset.id, file);
    await hydrate(asset);
  } catch (error) {
    mediaStore.getState().patch(asset.id, { status: "error", error: (error as Error).message });
    reportError(error);
  }
}

/** Matches the canvas to the first video on an empty timeline, like "new sequence from clip". */
function adoptFormat(project: Project, asset: Asset): Project {
  if (Object.keys(project.clips).length > 0 || asset.kind === "audio" || !asset.width)
    return project;
  const scale = Math.min(1, MAX_PROJECT_EDGE / Math.max(asset.width, asset.height));
  const even = (n: number) => Math.round((n * scale) / 2) * 2;
  return {
    ...project,
    settings: { ...project.settings, width: even(asset.width), height: even(asset.height) },
  };
}

export function addAssetToTimeline(
  assetId: Id,
  at: { trackId?: Id; start?: number } = {},
): Id | null {
  const clipId = newId();
  let placed = false;
  editorStore.getState().commit((project) => {
    const asset = project.assets[assetId];
    if (!asset) return project;
    const target =
      at.trackId && canPlace(project, asset.kind, at.trackId)
        ? { project, trackId: at.trackId }
        : trackFor(project, asset.kind, newId);
    const start = at.start ?? trackEnd(target.project, target.trackId);
    const clip = createMediaClip(asset, { id: clipId, trackId: target.trackId, start });
    placed = true;
    return placeClip(adoptFormat(target.project, asset), clip, newId);
  });
  if (!placed) return null;
  editorStore.getState().select([clipId]);
  return clipId;
}

export async function importFiles(files: Iterable<File>, place?: { trackId?: Id; start: number }) {
  let start = place?.start;
  for (const file of files) {
    const id = newId();
    const { patch, forget } = mediaStore.getState();
    patch(id, { status: "loading" });
    try {
      const probe = await media.load(id, file);
      const asset: Asset = { id, name: file.name, ...probe };
      editorStore.getState().commit((p) => ({ ...p, assets: { ...p.assets, [id]: asset } }));
      void saveMedia(id, file).catch(reportError);
      void hydrate(asset).catch(reportError);
      if (start !== undefined) {
        const clipId = addAssetToTimeline(id, { trackId: place?.trackId, start });
        const clip = clipId ? editorStore.getState().project.clips[clipId] : undefined;
        if (clip) start = clip.start + clip.duration;
      }
    } catch (error) {
      forget(id);
      reportError(error);
    }
  }
}

/** Undoable: the stored file is kept until a later session finds it unreferenced. */
export function deleteAsset(assetId: Id) {
  editorStore.getState().commit((p) => removeAsset(p, assetId));
  player.forget(assetId);
}
