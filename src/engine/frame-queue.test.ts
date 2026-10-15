import { describe, expect, it } from "vite-plus/test";
import { FrameQueue, keyframeAtOrBefore } from "./frame-queue";

interface Frame {
  timestamp: number;
  duration: number;
  index: number;
}

const FPS = 30;
const at = (index: number) => index / FPS;

/** A decoder of `total` frames at 30 fps; with `manual`, each frame waits for `step()`. */
function fakeDecoder({ total = 300, manual = false } = {}) {
  const opened: number[] = [];
  const produced: Frame[] = [];
  const released = new Map<number, number>();
  let waiting: (() => void)[] = [];
  const source = (start: number): AsyncIterator<Frame, void> => {
    opened.push(start);
    let index = Math.max(0, Math.floor(start * FPS + 1e-9));
    return {
      async next() {
        if (manual) await new Promise<void>((resolve) => waiting.push(resolve));
        else await Promise.resolve();
        if (index >= total) return { done: true, value: undefined };
        const frame = { timestamp: at(index), duration: 1 / FPS, index: index++ };
        produced.push(frame);
        return { done: false, value: frame };
      },
      async return() {
        return { done: true, value: undefined };
      },
    };
  };
  const release = (frame: Frame) => released.set(frame.index, (released.get(frame.index) ?? 0) + 1);
  const step = () => {
    const ready = waiting;
    waiting = [];
    ready.forEach((resolve) => resolve());
  };
  return { source, release, opened, produced, released, step };
}

/** Lets every pending promise chain run. */
const settle = async () => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

const queueFor = (decoder: ReturnType<typeof fakeDecoder>, keyframes?: number[]) =>
  new FrameQueue<Frame>({
    open: decoder.source,
    release: decoder.release,
    onFrame: () => {},
    keyframeAtOrBefore: keyframes ? (t) => keyframeAtOrBefore(keyframes, t) : () => null,
  });

describe("FrameQueue", () => {
  it("serves the frame on screen at t once it is decoded", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    expect(queue.frameAt(0)).toBeNull();
    await settle();
    expect(queue.frameAt(0)?.index).toBe(0);
    await settle();
    expect(queue.frameAt(at(1))?.index).toBe(1);
    expect(queue.frameAt(at(1) + 0.01)?.index).toBe(1);
  });

  it("catches up several frames in one tick, releasing the ones it skips", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    queue.frameAt(0);
    await settle();
    queue.frameAt(0.5);
    await settle();
    expect(queue.frameAt(0.5)?.index).toBe(15);
    expect(decoder.opened).toHaveLength(1);
    expect(queue.dropped).toBeGreaterThan(0);
    for (let i = 0; i < 15; i++) expect(decoder.released.get(i)).toBe(1);
  });

  it("seeks when asked for an earlier time", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    queue.frameAt(1);
    await settle();
    queue.frameAt(0.2);
    await settle();
    expect(queue.frameAt(0.2)?.index).toBe(6);
    expect(decoder.opened).toEqual([1, 0.2]);
  });

  it("decodes through unless a keyframe lies between, then seeks", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder, [0, 2, 4, 6]);
    queue.frameAt(0);
    await settle();
    queue.frameAt(1.5);
    await settle();
    expect(queue.frameAt(1.5)?.index).toBe(45);
    expect(decoder.opened).toEqual([0]);
    queue.frameAt(3);
    await settle();
    expect(queue.frameAt(3)?.index).toBe(90);
    expect(decoder.opened).toEqual([0, 3]);
  });

  it("never seeks to a stale target requested while a seek was in flight", async () => {
    const decoder = fakeDecoder({ manual: true });
    const queue = queueFor(decoder);
    queue.frameAt(1);
    queue.frameAt(5);
    queue.frameAt(6);
    expect(decoder.opened).toEqual([1]);
    decoder.step();
    await settle();
    queue.frameAt(6.1);
    expect(decoder.opened).toEqual([1, 6.1]);
  });

  it("primes a position without advancing past it", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    queue.prime(2);
    await settle();
    queue.prime(2);
    await settle();
    expect(decoder.opened).toEqual([2]);
    expect(queue.frameAt(2)?.index).toBe(60);
  });

  it("seeks ahead by the given lead while playing and waits there", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    queue.frameAt(4, 0.1);
    await settle();
    expect(decoder.opened).toEqual([4.1]);
    queue.frameAt(4.03, 0.1);
    await settle();
    expect(decoder.opened).toEqual([4.1]);
    expect(queue.frameAt(4.12, 0.1)?.index).toBe(123);
  });

  it("releases every decoded frame exactly once, across seeks and dispose", async () => {
    const decoder = fakeDecoder();
    const queue = queueFor(decoder);
    queue.frameAt(0);
    await settle();
    queue.frameAt(0.4);
    queue.frameAt(3);
    await settle();
    queue.frameAt(1);
    await settle();
    queue.frameAt(1.2);
    await settle();
    queue.dispose();
    await settle();
    expect(decoder.produced.length).toBeGreaterThan(0);
    for (const frame of decoder.produced)
      expect(decoder.released.get(frame.index) ?? 0).toBeGreaterThanOrEqual(1);
    expect([...decoder.released.values()].every((n) => n === 1)).toBe(true);
  });
});

describe("FrameQueue render requests", () => {
  it("asks for a render when a seek lands or a due frame arrives, not for lookahead", async () => {
    const decoder = fakeDecoder();
    let renders = 0;
    const queue = new FrameQueue<Frame>({
      open: decoder.source,
      release: decoder.release,
      onFrame: () => renders++,
      keyframeAtOrBefore: () => null,
    });
    queue.frameAt(0);
    await settle();
    expect(renders).toBe(1);
    queue.frameAt(0.4);
    await settle();
    expect(renders).toBeGreaterThan(1);
  });
});

describe("keyframeAtOrBefore", () => {
  it("finds the last keyframe at or before a time", () => {
    const keyframes = [0, 2, 4.5, 9];
    expect(keyframeAtOrBefore(keyframes, 0)).toBe(0);
    expect(keyframeAtOrBefore(keyframes, 4.4)).toBe(2);
    expect(keyframeAtOrBefore(keyframes, 4.5)).toBe(4.5);
    expect(keyframeAtOrBefore(keyframes, 100)).toBe(9);
    expect(keyframeAtOrBefore([1, 2], 0.5)).toBeNull();
  });
});
