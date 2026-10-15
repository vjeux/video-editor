import { sourceTimeAt, visualLayers } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";
import { renderFrame, type Ctx2D, type Drawable } from "./compositor";
import { FrameStream } from "./frame-stream";
import type { MediaLibrary } from "./media-library";

/** Clips starting this soon get their decoder warmed up so cuts land on time. */
const PREWARM = 0.5;

/** Renders the live preview from per-clip frame streams at preview resolution. */
export class PreviewRenderer {
  private readonly media: MediaLibrary;
  private readonly onFrame: () => void;
  private streams = new Map<Id, { assetId: Id; stream: FrameStream }>();
  private used = new Set<Id>();

  constructor(media: MediaLibrary, onFrame: () => void) {
    this.media = media;
    this.onFrame = onFrame;
  }

  private frame(clip: MediaClip, sourceTime: number): Drawable | null {
    const image = this.media.image(clip.assetId);
    if (image) return image;
    let entry = this.streams.get(clip.id);
    if (!entry || entry.assetId !== clip.assetId) {
      entry?.stream.dispose();
      const sink = this.media.previewSink(clip.assetId);
      if (!sink) return null;
      entry = { assetId: clip.assetId, stream: new FrameStream(sink, this.onFrame) };
      this.streams.set(clip.id, entry);
    }
    this.used.add(clip.id);
    return entry.stream.frameAt(sourceTime);
  }

  render(ctx: Ctx2D, project: Project, t: number, playing: boolean) {
    this.used.clear();
    renderFrame(ctx, project, t, (clip, sourceTime) => this.frame(clip, sourceTime));

    if (playing) {
      for (const clip of visualLayers(project, t + PREWARM)) {
        if (clip.type === "media" && clip.start > t)
          this.frame(clip, sourceTimeAt(clip, clip.start));
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
