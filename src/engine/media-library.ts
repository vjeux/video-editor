import {
  ALL_FORMATS,
  AudioBufferSink,
  BlobSource,
  CanvasSink,
  EncodedPacketSink,
  Input,
  type InputAudioTrack,
  type InputVideoTrack,
} from "mediabunny";
import type { AssetKind, Id } from "../core/types";

export interface ProbeResult {
  kind: AssetKind;
  duration: number | null;
  width: number;
  height: number;
  hasAudio: boolean;
}

interface VideoEntry {
  kind: "video";
  input: Input;
  video: InputVideoTrack;
  audio: InputAudioTrack | null;
  /** Display size, so per-stream sinks need no async lookups. */
  width: number;
  height: number;
  /** Keyframe times once indexed (null until then); seeks use them to avoid restarts. */
  keyframes: number[] | null;
  indexing: boolean;
}
interface AudioEntry {
  kind: "audio";
  input: Input;
  audio: InputAudioTrack;
}
interface ImageEntry {
  kind: "image";
  bitmap: ImageBitmap;
}
type Entry = VideoEntry | AudioEntry | ImageEntry;

/** Longest edge of decoded preview frames; export decodes at full resolution. */
const PREVIEW_MAX_EDGE = 1280;
/**
 * Canvases recycled per preview sink: the frame shown, the lookahead and
 * pulls still in flight from a decoder a seek just replaced.
 */
const PREVIEW_POOL = 8;

export class UnsupportedMediaError extends Error {}

async function playableTrack<T extends InputVideoTrack | InputAudioTrack>(track: T | null) {
  return track && (await track.canDecode()) ? track : null;
}

/** Owns Mediabunny inputs and decoders for every imported file, keyed by asset id. */
export class MediaLibrary {
  private entries = new Map<Id, Entry>();
  private audioBuffers = new Map<Id, Promise<AudioBuffer | null>>();

  async load(id: Id, file: Blob): Promise<ProbeResult> {
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file);
      this.entries.set(id, { kind: "image", bitmap });
      return {
        kind: "image",
        duration: null,
        width: bitmap.width,
        height: bitmap.height,
        hasAudio: false,
      };
    }

    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    try {
      const [video, audio] = await Promise.all([
        input.getPrimaryVideoTrack().then(playableTrack),
        input.getPrimaryAudioTrack().then(playableTrack),
      ]);
      const duration = await input.computeDuration();
      if (video) {
        const [width, height] = await Promise.all([
          video.getDisplayWidth(),
          video.getDisplayHeight(),
        ]);
        this.entries.set(id, {
          kind: "video",
          input,
          video,
          audio,
          width,
          height,
          keyframes: null,
          indexing: false,
        });
        return { kind: "video", duration, width, height, hasAudio: !!audio };
      }
      if (audio) {
        this.entries.set(id, { kind: "audio", input, audio });
        return { kind: "audio", duration, width: 0, height: 0, hasAudio: true };
      }
    } catch (error) {
      input.dispose();
      throw new UnsupportedMediaError(`Could not read this file: ${(error as Error).message}`);
    }
    input.dispose();
    throw new UnsupportedMediaError("This file has no video or audio your browser can decode");
  }

  has(id: Id): boolean {
    return this.entries.has(id);
  }

  image(id: Id): ImageBitmap | null {
    const entry = this.entries.get(id);
    return entry?.kind === "image" ? entry.bitmap : null;
  }

  videoTrack(id: Id): InputVideoTrack | null {
    const entry = this.entries.get(id);
    return entry?.kind === "video" ? entry.video : null;
  }

  /**
   * A preview-resolution sink for one frame stream. Its canvases are pooled
   * and recycled in pull order, so a sink is never shared between streams.
   */
  createPreviewSink(id: Id): CanvasSink | null {
    const entry = this.entries.get(id);
    if (entry?.kind !== "video") return null;
    this.indexKeyframes(entry);
    const landscape = entry.width >= entry.height;
    const edge = Math.min(PREVIEW_MAX_EDGE, landscape ? entry.width : entry.height);
    return new CanvasSink(entry.video, {
      ...(landscape ? { width: edge } : { height: edge }),
      poolSize: PREVIEW_POOL,
    });
  }

  /** Sorted keyframe times of a video, or null until they are indexed. */
  keyframes(id: Id): number[] | null {
    const entry = this.entries.get(id);
    return entry?.kind === "video" ? entry.keyframes : null;
  }

  /** Walks the keyframe index once per file (metadata only: no packet data is read). */
  private indexKeyframes(entry: VideoEntry) {
    if (entry.indexing || entry.keyframes) return;
    entry.indexing = true;
    void (async () => {
      const sink = new EncodedPacketSink(entry.video);
      const times: number[] = [];
      let packet = await sink.getFirstPacket({ metadataOnly: true });
      if (packet && packet.type !== "key") {
        packet = await sink.getNextKeyPacket(packet, { metadataOnly: true });
      }
      while (packet) {
        times.push(packet.timestamp);
        packet = await sink.getNextKeyPacket(packet, { metadataOnly: true });
      }
      entry.keyframes = times;
    })().catch(() => {
      // Without an index, seeking falls back to a distance rule.
    });
  }

  /** Whole-file decode into one AudioBuffer, shared by playback, export and waveforms. */
  audioBuffer(id: Id): Promise<AudioBuffer | null> {
    let pending = this.audioBuffers.get(id);
    if (!pending) {
      const entry = this.entries.get(id);
      const track = entry && entry.kind !== "image" ? entry.audio : null;
      pending = track ? decodeWholeTrack(track) : Promise.resolve(null);
      this.audioBuffers.set(id, pending);
    }
    return pending;
  }

  /** Small evenly spaced frames for bin posters and timeline filmstrips. */
  /** A full-resolution PNG of the frame shown at `time` (for freeze frames). */
  async stillAt(id: Id, time: number): Promise<Blob> {
    const track = this.videoTrack(id);
    if (!track) throw new Error("Freeze frames need a video clip");
    const frame = await new CanvasSink(track).getCanvas(time);
    if (!frame) throw new Error("No frame at this time");
    const { canvas } = frame;
    return canvas instanceof OffscreenCanvas
      ? canvas.convertToBlob({ type: "image/png" })
      : new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the frame"))),
            "image/png",
          ),
        );
  }

  async thumbnails(id: Id, times: number[], height: number): Promise<ImageBitmap[]> {
    const image = this.image(id);
    if (image) {
      const one = await createImageBitmap(image, { resizeHeight: height, resizeQuality: "medium" });
      return times.map(() => one);
    }
    const track = this.videoTrack(id);
    if (!track) return [];
    const sink = new CanvasSink(track, { height });
    const frames: ImageBitmap[] = [];
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (wrapped) frames.push(await createImageBitmap(wrapped.canvas));
      else if (frames.length) frames.push(frames.at(-1)!);
    }
    return frames;
  }

  remove(id: Id): void {
    const entry = this.entries.get(id);
    if (entry?.kind === "image") entry.bitmap.close();
    else entry?.input.dispose();
    this.entries.delete(id);
    this.audioBuffers.delete(id);
  }
}

async function decodeWholeTrack(track: InputAudioTrack): Promise<AudioBuffer> {
  const [sampleRate, channels] = await Promise.all([
    track.getSampleRate(),
    track.getNumberOfChannels(),
  ]);
  const chunks: { buffer: AudioBuffer; timestamp: number }[] = [];
  for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers()) {
    chunks.push({ buffer, timestamp });
  }
  const end = chunks.reduce(
    (max, c) => Math.max(max, Math.round(c.timestamp * sampleRate) + c.buffer.length),
    0,
  );
  const whole = new AudioBuffer({
    length: Math.max(1, end),
    numberOfChannels: channels,
    sampleRate,
  });
  for (const { buffer, timestamp } of chunks) {
    const at = Math.max(0, Math.round(timestamp * sampleRate));
    for (let ch = 0; ch < channels; ch++) {
      whole.copyToChannel(buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1)), ch, at);
    }
  }
  return whole;
}
