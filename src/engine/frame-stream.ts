import type { CanvasSink, WrappedCanvas } from "mediabunny";
import { perf } from "./perf";

/** Jumps further than this restart decoding at the target instead of decoding through. */
const SEEK_THRESHOLD = 0.75;
const EPSILON = 1e-3;

/**
 * Serves frames for one clip from a sequential Mediabunny iterator.
 * Forward playback advances the iterator frame by frame; scrubs and large
 * jumps restart it at the requested time (latest request wins). While a seek
 * is in flight the previous frame keeps being served, so the preview never
 * flashes black.
 */
export class FrameStream {
  private iterator: AsyncGenerator<WrappedCanvas, void> | null = null;
  private current: WrappedCanvas | null = null;
  private next: WrappedCanvas | null = null;
  private fetchingFor: AsyncGenerator<WrappedCanvas, void> | null = null;
  private seeking = false;
  private queuedSeek: number | null = null;
  private disposed = false;

  private readonly sink: CanvasSink;
  private readonly onFrame: () => void;

  constructor(sink: CanvasSink, onFrame: () => void) {
    this.sink = sink;
    this.onFrame = onFrame;
  }

  frameAt(t: number): WrappedCanvas["canvas"] | null {
    const { current } = this;
    const outOfRange =
      !current ||
      t < current.timestamp - EPSILON ||
      t > current.timestamp + Math.max(SEEK_THRESHOLD, current.duration);

    if (!this.iterator || (outOfRange && !this.reachable(t))) {
      this.seek(t);
    } else if (this.next && this.next.timestamp <= t + EPSILON) {
      this.current = this.next;
      this.next = null;
      this.pull();
    }
    const shown = this.current;
    if (shown) perf.frameShown(t - shown.timestamp, t > shown.timestamp + shown.duration + EPSILON);
    return shown?.canvas ?? null;
  }

  /** The prefetched frame is ahead of `t` but within decode-through range. */
  private reachable(t: number): boolean {
    return (
      !!this.next && t >= this.next.timestamp - EPSILON && t <= this.next.timestamp + SEEK_THRESHOLD
    );
  }

  private seek(t: number) {
    if (this.seeking) {
      this.queuedSeek = t;
      return;
    }
    this.seeking = true;
    const startedAt = performance.now();
    void this.iterator?.return();
    const iterator = this.sink.canvases(t);
    this.iterator = iterator;
    this.next = null;

    void (async () => {
      try {
        const first = await iterator.next();
        if (this.disposed || this.iterator !== iterator) return;
        if (!first.done) this.current = first.value;
        perf.seek(performance.now() - startedAt);
        this.pull();
        this.onFrame();
      } finally {
        this.seeking = false;
        const queued = this.queuedSeek;
        this.queuedSeek = null;
        if (queued !== null && !this.disposed) this.seek(queued);
      }
    })();
  }

  private pull() {
    const iterator = this.iterator;
    if (!iterator || this.fetchingFor === iterator) return;
    this.fetchingFor = iterator;
    void iterator
      .next()
      .then((result) => {
        if (this.disposed || this.iterator !== iterator) return;
        this.next = result.done ? null : result.value;
        this.onFrame();
      })
      .finally(() => {
        if (this.fetchingFor === iterator) this.fetchingFor = null;
      });
  }

  dispose() {
    this.disposed = true;
    void this.iterator?.return();
    this.iterator = null;
  }
}
