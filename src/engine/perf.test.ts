import { describe, expect, it } from "vite-plus/test";
import { RollingStats } from "./perf";

describe("RollingStats", () => {
  it("reports percentiles and the maximum of recent samples", () => {
    const stats = new RollingStats(100);
    for (let i = 1; i <= 100; i++) stats.push(i);
    expect(stats.percentile(0.5)).toBe(50);
    expect(stats.percentile(0.95)).toBe(95);
    expect(stats.max()).toBe(100);
    expect(stats.count).toBe(100);
  });

  it("keeps only the latest samples once full", () => {
    const stats = new RollingStats(3);
    [10, 20, 30, 1, 2].forEach((v) => stats.push(v));
    expect(stats.count).toBe(3);
    expect(stats.max()).toBe(30);
    expect(stats.percentile(0)).toBe(1);
  });

  it("is zero when empty and can be cleared", () => {
    const stats = new RollingStats(4);
    expect(stats.percentile(0.5)).toBe(0);
    stats.push(5);
    stats.clear();
    expect(stats.count).toBe(0);
    expect(stats.max()).toBe(0);
  });
});
