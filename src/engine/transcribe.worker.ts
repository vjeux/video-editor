/// <reference lib="webworker" />
import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

export interface WorkerRequest {
  /** 16 kHz mono samples. */
  audio: Float32Array;
  model: string;
  /** ISO 639-1 code of the spoken language (the models do not detect it reliably). */
  language: string;
}

export type WorkerMessage =
  | { type: "download"; progress: number }
  | { type: "ready"; device: string }
  | { type: "done"; words: { text: string; start: number; end: number | null }[] }
  | { type: "error"; message: string };

type Chunk = { text: string; timestamp: [number, number | null] };

const post = (message: WorkerMessage) => self.postMessage(message);

let loaded: { model: string; pipe: Promise<AutomaticSpeechRecognitionPipeline> } | null = null;

async function pickDevice(): Promise<"webgpu" | "wasm"> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  return gpu && (await gpu.requestAdapter().catch(() => null)) ? "webgpu" : "wasm";
}

/** Loads (once per model) and reports download progress summed over every model file. */
function load(model: string): Promise<AutomaticSpeechRecognitionPipeline> {
  if (loaded?.model === model) return loaded.pipe;
  const files = new Map<string, { loaded: number; total: number }>();
  const pipe = pickDevice().then(async (device) => {
    const asr = await pipeline("automatic-speech-recognition", model, {
      device,
      dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
      progress_callback: (event: {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (event.status !== "progress" || !event.file || !event.total) return;
        files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
        const all = [...files.values()];
        const total = all.reduce((sum, f) => sum + f.total, 0);
        post({ type: "download", progress: all.reduce((sum, f) => sum + f.loaded, 0) / total });
      },
    });
    post({ type: "ready", device });
    return asr;
  });
  loaded = { model, pipe };
  pipe.catch(() => (loaded = null));
  return pipe;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const asr = await load(data.model);
    const output = await asr(data.audio, {
      return_timestamps: "word",
      chunk_length_s: 30,
      language: data.language,
      task: "transcribe",
    });
    const chunks = ((Array.isArray(output) ? output[0] : output)?.chunks ?? []) as Chunk[];
    post({
      type: "done",
      words: chunks.map((c) => ({ text: c.text, start: c.timestamp[0], end: c.timestamp[1] })),
    });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
