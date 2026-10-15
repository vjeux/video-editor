import type { CanvasSink, WrappedCanvas } from "mediabunny";
import { FrameQueue, keyframeAtOrBefore } from "./frame-queue";
import { perf } from "./perf";

const EPSILON = 1e-3;
/** Seek-ahead while playing: a decoder lands this much after where it was asked. */
const MAX_LEAD = 0.3;
const LEAD_SMOOTHING = 0.3;

/**
 * Serves one clip's preview frames from its own pooled sink. Frame choice,
 * catch-up and seeking live in FrameQueue; this binds it to Mediabunny and
 * reports what playback looks like to the perf recorder.
 */
export class FrameStream {
  private readonly queue: FrameQueue<WrappedCanvas>;
  private seekLatency = 0;
  private reportedDrops = 0;

  constructor(sink: CanvasSink, keyframes: () => number[] | null, onFrame: () => void) {
    this.queue = new FrameQueue<WrappedCanvas>({
      open: (start) => sink.canvases(start),
      // Pooled canvases are recycled by the sink; nothing to free.
      release: () => {},
      onFrame,
      keyframeAtOrBefore: (t) => {
        const times = keyframes();
        return times ? keyframeAtOrBefore(times, t) : null;
      },
      onSeek: (ms) => {
        perf.seek(ms);
        this.seekLatency += (ms / 1000 - this.seekLatency) * LEAD_SMOOTHING;
      },
    });
  }

  /** The frame to show at source time `t`; while playing, seeks land a little ahead. */
  frameAt(t: number, playing: boolean): WrappedCanvas["canvas"] | null {
    const frame = this.queue.frameAt(t, playing ? Math.min(MAX_LEAD, this.seekLatency) : 0);
    this.report();
    if (frame) perf.frameShown(t - frame.timestamp, t > frame.timestamp + frame.duration + EPSILON);
    return frame?.canvas ?? null;
  }

  /** Gets ready to show `t` (a clip about to start) without advancing. */
  prime(t: number) {
    this.queue.prime(t);
  }

  dispose() {
    this.queue.dispose();
  }

  private report() {
    const { dropped } = this.queue;
    if (dropped > this.reportedDrops) perf.drop(dropped - this.reportedDrops);
    this.reportedDrops = dropped;
  }
}
