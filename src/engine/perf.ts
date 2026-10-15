/** A fixed-size window of the most recent samples. */
export class RollingStats {
  private readonly values: number[] = [];
  private readonly capacity: number;
  private next = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get count(): number {
    return this.values.length;
  }

  push(value: number): void {
    if (this.values.length < this.capacity) this.values.push(value);
    else this.values[this.next] = value;
    this.next = (this.next + 1) % this.capacity;
  }

  /** The value below which a fraction `q` of the samples fall (0 when empty). */
  percentile(q: number): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.floor(q * (sorted.length - 1))] ?? 0;
  }

  max(): number {
    return this.values.reduce((m, v) => Math.max(m, v), 0);
  }

  clear(): void {
    this.values.length = 0;
    this.next = 0;
  }
}

export interface ExportStats {
  frames: number;
  seconds: number;
  /** Time spent waiting in each stage, in seconds. */
  decode: number;
  render: number;
  encode: number;
  mixdown: number;
  codec: string | null;
}

export interface PerfSnapshot {
  /** Composites in the last second. */
  fps: number;
  renderP50: number;
  renderP95: number;
  renderMax: number;
  /** How far the shown video frame trails the playhead, in ms. */
  lagP95: number;
  seeks: number;
  seekP95: number;
  /** Frames decoded but skipped to catch up. */
  dropped: number;
  /** Ticks where the shown frame was older than its own duration. */
  overdue: number;
}

const WINDOW_MS = 1000;

/**
 * Live playback and export measurements. Recording is a few numeric pushes,
 * so it always runs; the `?perf` overlay and benchmarks read it.
 */
class PerfRecorder {
  readonly render = new RollingStats(240);
  readonly lag = new RollingStats(240);
  readonly seekLatency = new RollingStats(60);
  private stamps: number[] = [];
  seeks = 0;
  dropped = 0;
  overdue = 0;
  lastExport: ExportStats | null = null;

  composite(ms: number) {
    const now = performance.now();
    this.render.push(ms);
    this.stamps.push(now);
    while ((this.stamps[0] ?? now) < now - WINDOW_MS) this.stamps.shift();
  }

  frameShown(lagSeconds: number, overdue: boolean) {
    this.lag.push(Math.max(0, lagSeconds) * 1000);
    if (overdue) this.overdue++;
  }

  seek(ms: number) {
    this.seeks++;
    this.seekLatency.push(ms);
  }

  drop(count: number) {
    this.dropped += count;
  }

  snapshot(): PerfSnapshot {
    const now = performance.now();
    return {
      fps: this.stamps.filter((s) => s >= now - WINDOW_MS).length,
      renderP50: this.render.percentile(0.5),
      renderP95: this.render.percentile(0.95),
      renderMax: this.render.max(),
      lagP95: this.lag.percentile(0.95),
      seeks: this.seeks,
      seekP95: this.seekLatency.percentile(0.95),
      dropped: this.dropped,
      overdue: this.overdue,
    };
  }

  reset() {
    this.render.clear();
    this.lag.clear();
    this.seekLatency.clear();
    this.stamps = [];
    this.seeks = 0;
    this.dropped = 0;
    this.overdue = 0;
  }
}

export const perf = new PerfRecorder();
