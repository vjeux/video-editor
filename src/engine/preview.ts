import { layerClips, layersAt } from "../core/layers";
import { frameSourceTime } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";
import { resolveEffect } from "../effects/resolve";
import { renderFrame, ScratchCanvases, type Ctx2D, type Drawable } from "./compositor";
import { FrameStream } from "./frame-stream";
import { createGpu } from "./gpu";
import type { MediaLibrary } from "./media-library";

/** Clips starting this soon get their decoder warmed up so cuts land on time. */
const PREWARM = 0.5;

/** Renders the live preview from per-clip frame streams at preview resolution. */
export class PreviewRenderer {
  private readonly media: MediaLibrary;
  private readonly onFrame: () => void;
  private streams = new Map<Id, { assetId: Id; stream: FrameStream }>();
  private used = new Set<Id>();
  private readonly gpu: ReturnType<typeof createGpu>;
  private readonly scratch = new ScratchCanvases();

  constructor(media: MediaLibrary, onFrame: () => void, onError: (error: Error) => void) {
    this.media = media;
    this.onFrame = onFrame;
    this.gpu = createGpu(onError);
  }

  /** The clip's frame stream, created on first use; marks it as still needed. */
  private stream(clip: MediaClip): FrameStream | null {
    let entry = this.streams.get(clip.id);
    if (!entry || entry.assetId !== clip.assetId) {
      entry?.stream.dispose();
      const sink = this.media.createPreviewSink(clip.assetId);
      if (!sink) return null;
      const assetId = clip.assetId;
      const stream = new FrameStream(sink, () => this.media.keyframes(assetId), this.onFrame);
      entry = { assetId, stream };
      this.streams.set(clip.id, entry);
    }
    this.used.add(clip.id);
    return entry.stream;
  }

  private frame(clip: MediaClip, sourceTime: number, playing: boolean): Drawable | null {
    return (
      this.media.image(clip.assetId) ?? this.stream(clip)?.frameAt(sourceTime, playing) ?? null
    );
  }

  render(ctx: Ctx2D, project: Project, t: number, playing: boolean, atRest: string | null = null) {
    this.used.clear();
    renderFrame(ctx, project, t, {
      frames: (clip, sourceTime) => this.frame(clip, sourceTime, playing),
      gpu: this.gpu,
      resolve: (id) => resolveEffect(project, id),
      scratch: this.scratch,
      atRest,
    });

    if (playing) {
      const soon = t + PREWARM;
      for (const clip of layersAt(project, soon).flatMap(layerClips)) {
        if (clip.type === "media" && clip.start > t)
          this.frame(clip, frameSourceTime(project, clip, soon), playing);
      }
    }

    for (const [id, { stream }] of this.streams) {
      if (this.used.has(id)) continue;
      stream.dispose();
      this.streams.delete(id);
    }
  }

  dispose() {
    for (const { stream } of this.streams.values()) stream.dispose();
    this.streams.clear();
  }
}
