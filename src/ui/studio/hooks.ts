import { useEffect, useEffectEvent, useState } from "react";

/** `value`, once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}

/** While `running`, calls `onFrame` with the seconds since the previous frame. */
export function useAnimationFrames(running: boolean, onFrame: (seconds: number) => void) {
  const frame = useEffectEvent(onFrame);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let id = requestAnimationFrame(function step(now) {
      frame((now - last) / 1000);
      last = now;
      id = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
}

/** Calls `onKey` for every window keydown while mounted. */
export function useWindowKeydown(onKey: (event: KeyboardEvent) => void) {
  const handle = useEffectEvent(onKey);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handle(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
