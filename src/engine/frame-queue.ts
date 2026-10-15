export interface TimedFrame {
  timestamp: number;
  duration: number;
}

export interface FrameQueueOptions<F extends TimedFrame> {
  open: (start: number) => AsyncIterator<F, void>;
  release: (frame: F) => void;
  onFrame: () => void;
  keyframeAtOrBefore: (t: number) => number | null;
  lookahead?: number;
}

export function keyframeAtOrBefore(_keyframes: readonly number[], _t: number): number | null {
  throw new Error("Not implemented");
}

export class FrameQueue<F extends TimedFrame> {
  dropped = 0;
  seeks = 0;
  lastSeekMs = 0;
  constructor(_options: FrameQueueOptions<F>) {}
  frameAt(_t: number, _lead = 0): F | null {
    throw new Error("Not implemented");
  }
  prime(_t: number): void {
    throw new Error("Not implemented");
  }
  dispose(): void {
    throw new Error("Not implemented");
  }
}
