import { describe, expect, it } from "vite-plus/test";
import {
  clipsOn,
  emptyProject,
  sequentialIds,
  textClip,
  videoClip,
  withClips,
} from "./fixtures.test-utils";
import { runScript } from "./script";
import type { TextClip } from "./types";

const base = () =>
  withClips(emptyProject(), videoClip("v1", 0, 4), videoClip("v2", 4, 4), textClip("t", 0, 2));
const run = (code: string, project = base()) => runScript(project, code, sequentialIds("s"));

describe("runScript", () => {
  it("queries clips by type and track", async () => {
    const { logs } = await run(`
      log(timeline.clips({ type: "video" }).map((c) => c.start));
      log(timeline.clips({ track: "T1" }).length);
    `);
    expect(logs).toEqual(["[0,4]", "1"]);
  });

  it("adds a title per video clip, overwriting what was underneath", async () => {
    const { project } = await run(`
      const dates = ["Feb 12", "Apr 12"];
      timeline.clips({ type: "video" }).forEach((clip, i) => {
        timeline.addText(dates[i], { start: clip.start, duration: 2 });
      });
    `);
    const titles = Object.values(project.clips).filter((c): c is TextClip => c.type === "text");
    expect(
      titles.map((t) => [t.text, t.start]).sort((a, b) => Number(a[1]) - Number(b[1])),
    ).toEqual([
      ["Feb 12", 0],
      ["Apr 12", 4],
    ]);
  });

  it("clones a clip with overrides", async () => {
    const { project } = await run(`
      const first = timeline.clips({ type: "text" })[0];
      first.clone({ start: 6, text: "Copy" });
    `);
    const copy = Object.values(project.clips).find((c) => c.type === "text" && c.text === "Copy");
    expect(copy).toMatchObject({ start: 6, duration: 2, trackId: "T1" });
  });

  it("edits, moves, splits and removes through clip handles", async () => {
    const { project } = await run(`
      const [a, b] = timeline.clips({ type: "video" });
      a.set({ volume: 0.5 });
      b.split(6);
      timeline.clips({ type: "text" })[0].remove();
    `);
    expect(project.clips.v1).toMatchObject({ volume: 0.5 });
    expect(clipsOn(project, "V1").map((c) => c.start)).toEqual([0, 4, 6]);
    expect(clipsOn(project, "T1")).toEqual([]);
  });

  it("adds markers", async () => {
    const { project } = await run(`timeline.addMarker(3, "Beat")`);
    expect(project.markers).toEqual([{ id: "s-1", time: 3, label: "Beat" }]);
  });

  it("supports await and reports errors without touching the project", async () => {
    const original = base();
    const { project, error } = await run(
      `await Promise.resolve(); timeline.clips()[0].remove(); throw new Error("nope")`,
      original,
    );
    expect(error).toBe("nope");
    expect(project).toBe(original);
  });

  it("rejects invalid edits with a readable error", async () => {
    const { error } = await run(`timeline.clips({ type: "video" })[0].move(0, "A1")`);
    expect(error).toMatch(/does not accept/);
  });
});

describe("effects in scripts", () => {
  const catalog = [
    {
      id: "vignette",
      name: "Vignette",
      kind: "effect" as const,
      category: "Light",
      description: "",
      author: "",
      source: "",
      params: [{ key: "amount", label: "Amount", type: "float" as const, default: 0.5 }],
      lut: null,
    },
    {
      id: "crossfade",
      name: "Crossfade",
      kind: "transition" as const,
      category: "Transitions",
      description: "",
      author: "",
      source: "",
      params: [],
      lut: null,
    },
  ];
  const runWith = (code: string) => runScript(base(), code, sequentialIds("s"), catalog);

  it("adds effects, transitions and animations by name", async () => {
    const { project, error } = await runWith(`
      const [a, b] = timeline.clips({ type: "video" });
      a.addEffect("Vignette", { amount: 0.9 });
      b.setTransition("crossfade", { duration: 0.5 });
      b.animateIn("fade", { duration: 0.3, easing: "easeOut" });
      log(timeline.effects().map((e) => e.name).join(","));
    `);
    expect(error).toBeNull();
    expect(project.clips.v1?.effects).toMatchObject([
      { effectId: "vignette", params: { amount: 0.9 } },
    ]);
    expect(project.clips.v2?.transitionIn).toMatchObject({ effectId: "crossfade", duration: 0.5 });
    expect(project.clips.v2?.animationIn).toEqual({
      presetId: "fade",
      duration: 0.3,
      easing: "easeOut",
    });
  });

  it("adds adjustment layers", async () => {
    const { project } = await runWith(
      `timeline.addAdjustment({ start: 1, duration: 2 }).addEffect("vignette")`,
    );
    const adjustment = Object.values(project.clips).find((c) => c.type === "adjustment");
    expect(adjustment).toMatchObject({
      start: 1,
      duration: 2,
      effects: [{ effectId: "vignette" }],
    });
  });

  it("reports unknown effects", async () => {
    const { error } = await runWith(`timeline.clips()[0].addEffect("Nope")`);
    expect(error).toMatch(/No effect "Nope"/);
  });
});
