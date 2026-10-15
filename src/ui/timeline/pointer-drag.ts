const DRAG_THRESHOLD = 3;

interface PointerStart {
  clientX: number;
  clientY: number;
}

/**
 * Runs a pointer drag with window listeners. Moves under the threshold are
 * ignored; `onUp` receives whether the pointer actually moved.
 */
export function pointerDrag(
  start: PointerStart,
  onMove: (ev: PointerEvent) => void,
  onUp: (moved: boolean) => void,
) {
  let moved = false;
  const move = (ev: PointerEvent) => {
    if (
      !moved &&
      Math.hypot(ev.clientX - start.clientX, ev.clientY - start.clientY) < DRAG_THRESHOLD
    )
      return;
    moved = true;
    onMove(ev);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    onUp(moved);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
