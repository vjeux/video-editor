import {
  ALL_FORMATS,
  AudioBufferSink,
  BlobSource,
  CanvasSink,
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

export class UnsupportedMediaError extends Error {}

async function playableTrack<T extends InputVideoTrack | InputAudioTrack>(track: T | null) {
  return track && (await track.canDecode()) ? track : null;
}

/** Owns Mediabunny inputs and decoders for every imported file, keyed by asset id. */
export class MediaLibrary {
  private entries = new Map<Id, Entry>();
  private previewSinks = new Map<Id, CanvasSink>();
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
        this.entries.set(id, { kind: "video", input, video, audio });
        const [width, height] = await Promise.all([
          video.getDisplayWidth(),
          video.getDisplayHeight(),
        ]);
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

  /** Shared preview-resolution sink; each consumer runs its own iterator over it. */
  previewSink(id: Id): CanvasSink | null {
    const cached = this.previewSinks.get(id);
    if (cached) return cached;
    const track = this.videoTrack(id);
    if (!track) return null;
    const landscape = track.displayWidth >= track.displayHeight;
    const edge = Math.min(PREVIEW_MAX_EDGE, landscape ? track.displayWidth : track.displayHeight);
    const sink = new CanvasSink(track, landscape ? { width: edge } : { height: edge });
    this.previewSinks.set(id, sink);
    return sink;
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
    this.previewSinks.delete(id);
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
