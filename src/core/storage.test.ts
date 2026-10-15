import { describe, expect, it } from "vite-plus/test";
import { storageFit } from "./storage";

const GB = 1024 ** 3;

describe("storageFit", () => {
  it("fits when the copy leaves head-room under the quota", () => {
    expect(storageFit({ usage: 1 * GB, quota: 10 * GB }, 2 * GB)).toEqual({
      fits: true,
      free: 9 * GB,
    });
  });

  it("does not fit when the copy would fill the quota", () => {
    const fit = storageFit({ usage: 9 * GB, quota: 10 * GB }, 0.99 * GB);
    expect(fit.fits).toBe(false);
    expect(fit.free).toBe(1 * GB);
  });

  it("trusts the write when the browser reports no estimate", () => {
    expect(storageFit({}, 5 * GB)).toEqual({ fits: true, free: null });
  });
});
