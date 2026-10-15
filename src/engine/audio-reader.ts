import type { WrappedAudioBuffer } from "mediabunny";
import { overlap } from "../core/audio-windows";
import type { Seconds } from "../core/types";

/** Decoded source sound: `buffer` sample 0 is at source time `start`. */
export interface AudioSlice {
  buffer: AudioBuffer;
  start: Seconds;
}

export type AudioChunks = AsyncGenerator<WrappedAudioBuffer, void, unknown>;

/** A forward jump this short decodes through instead of seeking. */
const MAX_SKIP: Seconds = 10;
const EPSILON = 1e-6;

/**
 * Reads windows of one track's sound in order, decoding every packet once
 * and holding only the chunks the current window touches. A window may start
 * anywhere from the previous window's start onwards (pre-rolled export
 * windows overlap); anything else reopens the decoder at the new position.
 */
export class AudioReader {
  private readonly open: (from: Seconds) => AudioChunks;
  private chunks: WrappedAudioBuffer[] = [];
  private iterator: AudioChunks | null = null;
  /** Source time the decoder has reached. */
  private decoded: Seconds = 0;
  private exhausted = false;
  /** Reads run one at a time: each continues where the last left the decoder. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(open: (from: Seconds) => AudioChunks) {
    this.open = open;
  }

  /** The source between `from` and `to` (seconds), or null where the track has none. */
  read(from: Seconds, to: Seconds): Promise<AudioSlice | null> {
    const next = this.queue.then(() => this.readNow(from, to));
    this.queue = next.catch(() => {});
    return next;
  }

  async dispose(): Promise<void> {
    await this.queue;
    await this.close();
  }

  private async readNow(from: Seconds, to: Seconds): Promise<AudioSlice | null> {
    const kept = this.chunks[0]?.timestamp ?? this.decoded;
    if (!this.iterator || from < kept - EPSILON || from > this.decoded + MAX_SKIP) {
      await this.close();
      this.iterator = this.open(from);
      this.decoded = from;
    }
    this.chunks = this.chunks.filter((c) => c.timestamp + c.duration > from);
    while (!this.exhausted && this.decoded < to) {
      const result = await this.iterator!.next();
      if (result.done) {
        this.exhausted = true;
        break;
      }
      this.chunks.push(result.value);
      this.decoded = Math.max(this.decoded, result.value.timestamp + result.value.duration);
    }
    return assemble(this.chunks, from, Math.min(to, this.decoded));
  }

  private async close() {
    await this.iterator?.return();
    this.iterator = null;
    this.chunks = [];
    this.exhausted = false;
  }
}

/** Copies the decoded chunks that cover `from…to` into one buffer at the track's rate. */
function assemble(chunks: WrappedAudioBuffer[], from: Seconds, to: Seconds): AudioSlice | null {
  const first = chunks[0];
  if (!first) return null;
  const { sampleRate } = first.buffer;
  const range = { start: Math.floor(from * sampleRate), end: Math.ceil(to * sampleRate) };
  if (range.end <= range.start) return null;
  const channels = Math.max(...chunks.map((c) => c.buffer.numberOfChannels));
  const buffer = new AudioBuffer({
    length: range.end - range.start,
    numberOfChannels: channels,
    sampleRate,
  });
  for (const chunk of chunks) {
    const span = overlap(range, Math.round(chunk.timestamp * sampleRate), chunk.buffer.length);
    if (!span) continue;
    for (let ch = 0; ch < channels; ch++) {
      const data = chunk.buffer.getChannelData(Math.min(ch, chunk.buffer.numberOfChannels - 1));
      buffer.copyToChannel(data.subarray(span.from, span.to), ch, span.at);
    }
  }
  return { buffer, start: range.start / sampleRate };
}
