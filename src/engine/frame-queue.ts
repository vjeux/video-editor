/** A decoded frame: shown from `timestamp` for `duration` seconds. */
export interface TimedFrame {
  timestamp: number;
  duration: number;
}

export interface FrameQueueOptions<F extends TimedFrame> {
  /** Starts decoding at `start`: the first frame yielded is the one on screen then. */
  open: (start: number) => AsyncIterator<F, void>;
  /** Called exactly once for every frame the queue received and no longer needs. */
  release: (frame: F) => void;
  /** A seek landed or a due frame arrived: the caller should render again. */
  onFrame: () => void;
  /** The last keyframe at or before `t` in source time, or null while unknown. */
  keyframeAtOrBefore: (t: number) => number | null;
  /** Decoded frames held ahead of the one shown. */
  lookahead?: number;
  /** A seek landed after `ms` milliseconds. */
  onSeek?: (ms: number) => void;
}

/** Without keyframe positions, jumps further than this restart decoding at the target. */
const SEEK_THRESHOLD = 0.75;
const EPSILON = 1e-3;

/** The last keyframe time at or before `t` in a sorted list, or null when none is. */
export function keyframeAtOrBefore(keyframes: readonly number[], t: number): number | null {
  let lo = 0;
  let hi = keyframes.length - 1;
  let found: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const time = keyframes[mid] ?? Infinity;
    if (time <= t + EPSILON) {
      found = time;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/**
 * Picks which decoded frame to show for a time, from one sequential decoder
 * at a time. Frames already behind the playhead are dropped as they arrive,
 * so a lagging decoder catches up instead of drifting; a jump decodes
 * through when no keyframe lies between and seeks otherwise. At most one
 * seek is in flight and none is ever made to a stale target: when a seek
 * lands the caller renders again and the latest time decides. Every frame
 * received is released exactly once.
 */
export class FrameQueue<F extends TimedFrame> {
  private readonly options: FrameQueueOptions<F>;
  private readonly lookahead: number;
  private iterator: AsyncIterator<F, void> | null = null;
  private generation = 0;
  private current: F | null = null;
  private buffer: F[] = [];
  private pumping = -1;
  private ended = false;
  private seeking = false;
  /** The time a seek was made for: it may land ahead of it (lead), which is not "behind". */
  private seekedFor: number | null = null;
  /** The latest time asked for, so frames behind it can be dropped as they arrive. */
  private target = 0;
  private disposed = false;
  /** Frames decoded but skipped to catch up. */
  dropped = 0;

  constructor(options: FrameQueueOptions<F>) {
    this.options = options;
    this.lookahead = options.lookahead ?? 3;
  }

  /**
   * The frame to show at `t`. While playing, `lead` seeks a little past
   * `t` so the decoder lands where playback will be when it is ready.
   */
  frameAt(t: number, lead = 0): F | null {
    this.target = t;
    if (!this.iterator) {
      this.seek(t + lead, t);
      return this.current;
    }
    if (this.seeking) return this.current;
    if (this.needsSeek(t)) {
      this.seek(t + lead, t);
      return this.current;
    }
    this.advanceTo(t);
    this.pump();
    return this.current;
  }

  /** Gets the decoder to `t` (seeking if needed) without advancing what is shown. */
  prime(t: number): void {
    if (this.seeking) return;
    const current = this.current;
    const covers =
      current && t >= current.timestamp - EPSILON && t < current.timestamp + current.duration;
    if (!this.iterator || !covers) this.seek(t, t);
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    void this.iterator?.return?.();
    this.iterator = null;
    this.releaseAll();
  }

  private needsSeek(t: number): boolean {
    const current = this.current;
    if (!current) return false;
    const floor = Math.min(current.timestamp, this.seekedFor ?? Infinity);
    if (t < floor - EPSILON) return true;
    const newest = this.buffer.at(-1) ?? current;
    if (t < newest.timestamp + newest.duration || this.ended) return false;
    const keyframe = this.options.keyframeAtOrBefore(t);
    return keyframe === null
      ? t - newest.timestamp > SEEK_THRESHOLD
      : keyframe > newest.timestamp + EPSILON;
  }

  private advanceTo(t: number) {
    let skipped = -1;
    while (this.buffer[0] && this.buffer[0].timestamp <= t + EPSILON) {
      const next = this.buffer.shift();
      if (!next) break;
      if (this.current) this.options.release(this.current);
      this.current = next;
      skipped++;
    }
    if (skipped > 0) this.dropped += skipped;
    if (this.current && t >= this.current.timestamp) this.seekedFor = null;
  }

  /** Drops buffered frames that a later buffered frame already supersedes at the target. */
  private trimStale() {
    while (
      this.buffer.length >= 2 &&
      (this.buffer[1]?.timestamp ?? Infinity) <= this.target + EPSILON
    ) {
      const stale = this.buffer.shift();
      if (stale) this.options.release(stale);
      this.dropped++;
    }
  }

  private seek(start: number, requestedFor: number) {
    this.generation++;
    const generation = this.generation;
    void this.iterator?.return?.();
    for (const frame of this.buffer) this.options.release(frame);
    this.buffer = [];
    this.ended = false;
    this.seeking = true;
    this.seekedFor = requestedFor;
    const startedAt = performance.now();
    const iterator = this.options.open(Math.max(0, start));
    this.iterator = iterator;

    iterator
      .next()
      .then((result) => {
        if (generation !== this.generation) {
          if (!result.done) this.options.release(result.value);
          return;
        }
        this.seeking = false;
        this.options.onSeek?.(performance.now() - startedAt);
        if (result.done) this.ended = true;
        else {
          if (this.current) this.options.release(this.current);
          this.current = result.value;
        }
        this.pump();
        this.options.onFrame();
      })
      .catch(() => {
        if (generation === this.generation) this.seeking = false;
      });
  }

  /** Keeps up to `lookahead` frames decoded ahead, one loop per decoder generation. */
  private pump() {
    const iterator = this.iterator;
    const generation = this.generation;
    if (!iterator || this.ended || this.disposed || this.pumping === generation) return;
    this.pumping = generation;
    void (async () => {
      try {
        while (generation === this.generation && this.buffer.length < this.lookahead) {
          const result = await iterator.next();
          if (generation !== this.generation) {
            if (!result.done) this.options.release(result.value);
            return;
          }
          if (result.done) {
            this.ended = true;
            break;
          }
          this.buffer.push(result.value);
          this.trimStale();
          // Lookahead frames wait for their time; only one already due needs a render.
          if (result.value.timestamp <= this.target + EPSILON) this.options.onFrame();
        }
      } catch {
        // A decoder that fails stops here; the next seek starts a fresh one.
      } finally {
        if (this.pumping === generation) this.pumping = -1;
      }
    })();
  }

  private releaseAll() {
    for (const frame of this.buffer) this.options.release(frame);
    this.buffer = [];
    if (this.current) this.options.release(this.current);
    this.current = null;
  }
}
