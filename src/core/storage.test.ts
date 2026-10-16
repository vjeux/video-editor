import { describe, expect, it } from "vite-plus/test";
import { keepPlan, storageFit } from "./storage";

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

describe("keepPlan", () => {
  const estimate = { usage: 0, quota: 10 * GB };

  it("links files the browser can reopen, whatever their size, without using quota", () => {
    const plan = keepPlan([{ bytes: 50 * GB, linkable: true }], estimate);
    expect(plan.keep).toEqual(["link"]);
    expect(plan.copyBytes).toBe(0);
  });

  it("copies the other files when they fit together", () => {
    const plan = keepPlan(
      [
        { bytes: 2 * GB, linkable: false },
        { bytes: 50 * GB, linkable: true },
        { bytes: 3 * GB, linkable: false },
      ],
      estimate,
    );
    expect(plan.keep).toEqual(["copy", "link", "copy"]);
    expect(plan.copyBytes).toBe(5 * GB);
  });

  it("keeps every copy for the session alone when they don't all fit", () => {
    const plan = keepPlan(
      [
        { bytes: 6 * GB, linkable: false },
        { bytes: 1 * GB, linkable: true },
        { bytes: 4 * GB, linkable: false },
      ],
      estimate,
    );
    expect(plan.keep).toEqual(["session", "link", "session"]);
    expect(plan.copyBytes).toBe(10 * GB);
    expect(plan.free).toBe(10 * GB);
  });
});
