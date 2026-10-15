import { cleanWords, mergeWindows, transcriptionWindows } from "../core/captions";
import type { Seconds, TimedWord } from "../core/types";
import type { AudioReader } from "./audio-reader";
import type { WorkerMessage, WorkerRequest } from "./transcribe.worker";

/** Whisper reads 16 kHz mono. */
const SAMPLE_RATE = 16_000;

/** Both export word-level alignment heads, which word timestamps need. */
export const CAPTION_MODELS = {
  fast: { id: "onnx-community/whisper-tiny_timestamped", label: "Fast", size: "≈ 40 MB" },
  accurate: { id: "onnx-community/whisper-base_timestamped", label: "Accurate", size: "≈ 80 MB" },
} as const;

export type CaptionModel = keyof typeof CAPTION_MODELS;

export type TranscribeProgress =
  | { stage: "loading"; progress: number }
  | { stage: "transcribing"; progress: number };

export interface TranscribeOptions {
  model: CaptionModel;
  /** ISO 639-1 code of the spoken language. */
  language: string;
  signal: AbortSignal;
  onProgress: (progress: TranscribeProgress) => void;
}

/** One worker for the session, so the model stays loaded between runs. */
let worker: Worker | null = null;

const getWorker = () =>
  (worker ??= new Worker(new URL("./transcribe.worker.ts", import.meta.url), { type: "module" }));

/** Cancelling kills the worker mid-inference; the next run starts a fresh one. */
function discardWorker() {
  worker?.terminate();
  worker = null;
}

function transcribeWindow(
  request: WorkerRequest,
  signal: AbortSignal,
  onDownload: (progress: number) => void,
  onReady: () => void,
): Promise<WorkerMessage & { type: "done" }> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const abort = () => {
      discardWorker();
      reject(signal.reason);
    };
    w.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === "download") return onDownload(data.progress);
      if (data.type === "ready") return onReady();
      signal.removeEventListener("abort", abort);
      if (data.type === "done") resolve(data);
      else reject(new Error(`Transcription failed: ${data.message}`));
    };
    w.onerror = (event) => {
      signal.removeEventListener("abort", abort);
      discardWorker();
      reject(new Error(`Transcription failed: ${event.message}`));
    };
    signal.addEventListener("abort", abort, { once: true });
    w.postMessage(request, [request.audio.buffer]);
  });
}

/** Source `from…to` as 16 kHz mono, read in order and mixed down by the browser. */
async function resample(reader: AudioReader, from: Seconds, to: Seconds): Promise<Float32Array> {
  const length = Math.max(1, Math.ceil((to - from) * SAMPLE_RATE));
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length, sampleRate: SAMPLE_RATE });
  const slice = await reader.read(from, to);
  if (slice) {
    const source = ctx.createBufferSource();
    source.buffer = slice.buffer;
    source.connect(ctx.destination);
    source.start(0, from - slice.start, to - from);
  }
  return (await ctx.startRendering()).getChannelData(0);
}

/**
 * Transcribes `from…to` (source seconds) of `audio` into timed words, in
 * source time. Runs Whisper locally in a worker (WebGPU when available),
 * window by window so progress is real, cancelling stops promptly and only
 * one window of sound is ever decoded.
 */
export async function transcribe(
  audio: AudioReader,
  range: { from: Seconds; to: Seconds },
  { model, language, signal, onProgress }: TranscribeOptions,
): Promise<TimedWord[]> {
  const windows = transcriptionWindows(range.to - range.from);
  const results = [];
  onProgress({ stage: "loading", progress: 0 });
  for (const [i, window] of windows.entries()) {
    signal.throwIfAborted();
    const slice = await resample(audio, range.from + window.start, range.from + window.end);
    const done = await transcribeWindow(
      { audio: slice, model: CAPTION_MODELS[model].id, language },
      signal,
      (progress) => onProgress({ stage: "loading", progress }),
      () => onProgress({ stage: "transcribing", progress: i / windows.length }),
    );
    results.push({ window, words: cleanWords(done.words) });
    onProgress({ stage: "transcribing", progress: (i + 1) / windows.length });
  }
  return mergeWindows(results).map((w) => ({
    ...w,
    start: w.start + range.from,
    end: w.end + range.from,
  }));
}
