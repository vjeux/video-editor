import {
  AudioBufferSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  WebMOutputFormat,
  type InputVideoTrack,
  type OutputFormat,
  type Quality,
  type WrappedCanvas,
} from "mediabunny";
import { layerClips, layersAt } from "../core/layers";
import { audibleClips, frameSourceTime, projectDuration } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";
import { scheduleAudio } from "./audio-graph";
import { resolveEffect } from "../effects/resolve";
import {
  fontFor,
  renderFrame,
  ScratchCanvases,
  type Drawable,
  type RenderServices,
} from "./compositor";
import { perf, type ExportStats } from "./perf";
import { createGpu } from "./gpu";
import type { MediaLibrary } from "./media-library";

export type ExportFormat = "mp4" | "webm";
export type ExportQuality = "low" | "medium" | "high" | "very-high";

export interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  /** Output height in pixels; width follows the project aspect ratio. */
  height: number;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

export const EXPORT_FORMATS: Record<ExportFormat, { label: string; create(): OutputFormat }> = {
  mp4: {
    label: "MP4 · H.264 / AAC",
    create: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
  },
  webm: { label: "WebM · VP9 / Opus", create: () => new WebMOutputFormat() },
};

const QUALITIES: Record<ExportQuality, Quality> = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  "very-high": QUALITY_VERY_HIGH,
};

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
/** Audio is muxed in step with video, one second at a time. */
const AUDIO_CHUNK = 1;

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Full-resolution, strictly sequential frames for export. Each clip gets one
 * Mediabunny iterator fed with exactly the source timestamps the export loop
 * will ask for, so every packet is decoded at most once.
 */
class ExportFrames {
  private iterators = new Map<Id, AsyncGenerator<WrappedCanvas | null, void>>();
  private current = new Map<Id, Drawable | null>();
  private readonly project: Project;
  private readonly media: MediaLibrary;

  constructor(project: Project, media: MediaLibrary, frameTimes: number[]) {
    this.project = project;
    this.media = media;
    const plans = new Map<Id, { track: InputVideoTrack; times: number[] }>();
    for (const t of frameTimes) {
      for (const clip of layersAt(project, t).flatMap(layerClips)) {
        const track = clip.type === "media" ? media.videoTrack(clip.assetId) : null;
        if (!track || clip.type !== "media") continue;
        const plan = plans.get(clip.id) ?? { track, times: [] };
        plan.times.push(frameSourceTime(project, clip, t));
        plans.set(clip.id, plan);
      }
    }
    for (const [id, { track, times }] of plans) {
      this.iterators.set(id, new CanvasSink(track).canvasesAtTimestamps(times));
    }
  }

  /** Advances every clip visible at `t` by one frame. */
  async advance(t: number) {
    for (const clip of layersAt(this.project, t).flatMap(layerClips)) {
      const iterator = this.iterators.get(clip.id);
      if (!iterator) continue;
      const result = await iterator.next();
      if (!result.done && result.value) this.current.set(clip.id, result.value.canvas);
    }
  }

  lookup = (clip: MediaClip): Drawable | null =>
    this.media.image(clip.assetId) ?? this.current.get(clip.id) ?? null;

  async dispose() {
    await Promise.all([...this.iterators.values()].map((it) => it.return()));
  }
}

async function mixdown(
  project: Project,
  media: MediaLibrary,
  duration: number,
): Promise<AudioBuffer | null> {
  const clips = audibleClips(project);
  if (clips.length === 0) return null;
  const decoded = new Map<Id, AudioBuffer | null>();
  for (const clip of clips) decoded.set(clip.assetId, await media.audioBuffer(clip.assetId));
  const ctx = new OfflineAudioContext({
    numberOfChannels: CHANNELS,
    length: Math.ceil(duration * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
  });
  scheduleAudio(ctx, ctx.destination, project, 0, 0, (id) => decoded.get(id) ?? null);
  return ctx.startRendering();
}

function sliceAudio(buffer: AudioBuffer, from: number, to: number): AudioBuffer | null {
  const start = Math.round(from * buffer.sampleRate);
  const end = Math.min(buffer.length, Math.round(to * buffer.sampleRate));
  if (end <= start) return null;
  const slice = new AudioBuffer({
    length: end - start,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    slice.copyToChannel(buffer.getChannelData(ch).subarray(start, end), ch);
  }
  return slice;
}

async function loadFonts(project: Project) {
  const fonts = new Set(
    Object.values(project.clips).flatMap((clip) => (clip.type === "text" ? [fontFor(clip)] : [])),
  );
  await Promise.all([...fonts].map((font) => document.fonts.load(font)));
}

export async function exportProject(
  project: Project,
  media: MediaLibrary,
  opts: ExportOptions,
): Promise<Blob> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error("The timeline is empty");
  const { fps } = project.settings;
  const height = even(opts.height);
  const width = even((project.settings.width / project.settings.height) * height);

  const format = EXPORT_FORMATS[opts.format].create();
  const output = new Output({ format, target: new BufferTarget() });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create a 2D canvas for export");

  const videoCodec = await getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), {
    width,
    height,
  });
  if (!videoCodec)
    throw new Error(`This browser cannot encode video for ${opts.format.toUpperCase()}`);
  const video = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITIES[opts.quality],
    onEncoderConfig: (config) => (stats.codec = config.codec),
  });
  output.addVideoTrack(video, { frameRate: fps });

  const startedAt = performance.now();
  const stats: ExportStats = {
    frames: 0,
    seconds: 0,
    decode: 0,
    render: 0,
    encode: 0,
    mixdown: 0,
    codec: null,
  };
  const timed = async <T>(stage: "decode" | "encode" | "mixdown", work: Promise<T>): Promise<T> => {
    const from = performance.now();
    const result = await work;
    stats[stage] += (performance.now() - from) / 1000;
    return result;
  };

  const mix = await timed("mixdown", mixdown(project, media, duration));
  const audioCodec = mix
    ? await getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
        numberOfChannels: CHANNELS,
        sampleRate: SAMPLE_RATE,
      })
    : null;
  const audio = audioCodec
    ? new AudioBufferSource({ codec: audioCodec, bitrate: QUALITIES[opts.quality] })
    : null;
  if (audio) output.addAudioTrack(audio);

  await loadFonts(project);
  await output.start();

  const frameCount = Math.ceil(duration * fps);
  const frameTimes = Array.from({ length: frameCount }, (_, i) => i / fps);
  const frames = new ExportFrames(project, media, frameTimes);
  const gpuErrors: Error[] = [];
  const services: RenderServices = {
    frames: frames.lookup,
    gpu: createGpu((error) => gpuErrors.push(error)),
    resolve: (id) => resolveEffect(project, id),
    scratch: new ScratchCanvases(),
  };
  let audioWritten = 0;

  try {
    for (const [i, t] of frameTimes.entries()) {
      if (opts.signal.aborted) throw new DOMException("Export canceled", "AbortError");
      await timed("decode", frames.advance(t));
      const renderFrom = performance.now();
      renderFrame(ctx, project, t, services);
      stats.render += (performance.now() - renderFrom) / 1000;
      // A shader that fails to compile would otherwise export silently unfiltered.
      if (gpuErrors[0]) throw gpuErrors[0];
      await timed("encode", video.add(t, 1 / fps));

      while (audio && mix && audioWritten <= t && audioWritten < duration) {
        const chunk = sliceAudio(mix, audioWritten, Math.min(duration, audioWritten + AUDIO_CHUNK));
        if (chunk) await audio.add(chunk);
        audioWritten += AUDIO_CHUNK;
      }
      opts.onProgress((i + 1) / frameCount);
    }
    await output.finalize();
    perf.lastExport = {
      ...stats,
      frames: frameCount,
      seconds: (performance.now() - startedAt) / 1000,
    };
  } catch (error) {
    await output.cancel();
    throw error;
  } finally {
    await frames.dispose();
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Export produced no data");
  return new Blob([buffer], { type: format.mimeType });
}

let encodable: Promise<Record<ExportFormat, boolean>> | null = null;

/** Which formats this browser can encode at 1080p, probed once and cached for `use()`. */
export function encodableFormats(): Promise<Record<ExportFormat, boolean>> {
  encodable ??= Promise.all(
    (Object.keys(EXPORT_FORMATS) as ExportFormat[]).map(async (key) => {
      const format = EXPORT_FORMATS[key].create();
      const codec = await getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), {
        width: 1920,
        height: 1080,
      });
      return [key, codec !== null] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as Record<ExportFormat, boolean>);
  return encodable;
}

export const exportFileName = (project: Project, format: ExportFormat) =>
  `${project.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "export"}.${format}`;
