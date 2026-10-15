import { describe, expect, it } from "vite-plus/test";
import { placePopover } from "./placement";

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 300 };

describe("placePopover below an anchor", () => {
  const anchor = { x: 100, y: 100, width: 160, height: 28 };

  it("opens under the anchor, aligned to its left edge", () => {
    expect(placePopover(anchor, size, viewport, "below")).toEqual({ left: 100, top: 132 });
  });

  it("flips above when there is no room below but room above", () => {
    const low = { ...anchor, y: 600 };
    expect(placePopover(low, size, viewport, "below")).toEqual({ left: 100, top: 296 });
  });

  it("clamps into the viewport when neither side fits", () => {
    const tall = { width: 200, height: 760 };
    expect(placePopover({ ...anchor, y: 300 }, tall, viewport, "below").top).toBe(32);
  });

  it("shifts left to stay on screen near the right edge", () => {
    expect(placePopover({ ...anchor, x: 900 }, size, viewport, "below").left).toBe(792);
  });

  it("opens at a bare point, as a context menu does", () => {
    const point = { x: 400, y: 200, width: 0, height: 0 };
    expect(placePopover(point, size, viewport, "below", 0)).toEqual({ left: 400, top: 200 });
  });
});

describe("placePopover beside an anchor", () => {
  const item = { x: 300, y: 200, width: 180, height: 28 };

  it("opens to the right, top-aligned with the anchor", () => {
    expect(placePopover(item, size, viewport, "right", 2)).toEqual({ left: 482, top: 200 });
  });

  it("flips to the left when the right side would overflow", () => {
    const nearEdge = { ...item, x: 700 };
    expect(placePopover(nearEdge, size, viewport, "right", 2).left).toBe(498);
  });

  it("slides up so a submenu near the bottom stays visible", () => {
    expect(placePopover({ ...item, y: 700 }, size, viewport, "right", 2).top).toBe(492);
  });
});
