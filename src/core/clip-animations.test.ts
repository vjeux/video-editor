import { describe, expect, it } from "vite-plus/test";
import {
  ANIMATION_PRESETS,
  animationStateAt,
  EASINGS,
  ease,
  IDENTITY_MOTION,
  setAnimation,
} from "./clip-animations";
import { emptyProject, videoClip, withClips } from "./fixtures.test-utils";
import type { Clip, ClipAnimation } from "./types";

const anim = (
  presetId: string,
  duration = 1,
  easing: ClipAnimation["easing"] = "linear",
): ClipAnimation => ({
  presetId,
  duration,
  easing,
});

const clip = (patch: Partial<Clip>): Clip => ({ ...videoClip("c", 10, 4), ...patch }) as Clip;

describe("ease", () => {
  it("maps 0 to 0 and 1 to 1 for every easing", () => {
    for (const easing of EASINGS) {
      expect(ease(easing, 0)).toBeCloseTo(0);
      expect(ease(easing, 1)).toBeCloseTo(1);
    }
  });

  it("overshoots with backOut", () => {
    const samples = Array.from({ length: 50 }, (_, i) => ease("backOut", i / 49));
    expect(Math.max(...samples)).toBeGreaterThan(1);
  });
});

describe("animationStateAt", () => {
  it("is the identity outside the enter and exit windows", () => {
    const c = clip({ animationIn: anim("slideLeft"), animationOut: anim("fade") });
    expect(animationStateAt(c, 12)).toEqual({ motion: IDENTITY_MOTION, reveals: [] });
  });

  it("slides in from the left over the enter window", () => {
    const c = clip({ animationIn: anim("slideLeft", 2) });
    expect(animationStateAt(c, 10).motion.dx).toBeCloseTo(-1);
    expect(animationStateAt(c, 11).motion.dx).toBeCloseTo(-0.5);
    expect(animationStateAt(c, 12).motion.dx).toBeCloseTo(0);
  });

  it("plays exits in reverse towards the clip end", () => {
    const c = clip({ animationOut: anim("fade", 1) });
    expect(animationStateAt(c, 13).motion.opacity).toBeCloseTo(1);
    expect(animationStateAt(c, 13.5).motion.opacity).toBeCloseTo(0.5);
    expect(animationStateAt(c, 14).motion.opacity).toBeCloseTo(0);
  });

  it("combines motion presets multiplicatively and additively", () => {
    const c = clip({ animationIn: anim("zoomIn", 1) });
    const start = animationStateAt(c, 10).motion;
    expect(start.scale).toBeLessThan(1);
    expect(start.opacity).toBeCloseTo(0);
  });

  it("reports shader reveals with their progress", () => {
    const c = clip({ animationIn: anim("wipe", 2) });
    expect(animationStateAt(c, 11).reveals).toEqual([
      { effectId: ANIMATION_PRESETS.wipe!.effectId, progress: 0.5 },
    ]);
  });

  it("knows every preset it references", () => {
    for (const preset of Object.values(ANIMATION_PRESETS)) {
      expect(!!preset.motion !== !!preset.effectId).toBe(true);
    }
  });
});

describe("setAnimation", () => {
  it("sets enter and exit animations, keeping them from overlapping", () => {
    let project = withClips(emptyProject(), videoClip("c", 0, 4));
    project = setAnimation(project, "c", "in", anim("fade", 3));
    project = setAnimation(project, "c", "out", anim("fade", 3));
    expect(project.clips.c?.animationIn?.duration).toBe(3);
    expect(project.clips.c?.animationOut?.duration).toBe(1);
  });

  it("clears an animation", () => {
    let project = withClips(emptyProject(), videoClip("c", 0, 4));
    project = setAnimation(setAnimation(project, "c", "in", anim("fade")), "c", "in", null);
    expect(project.clips.c?.animationIn).toBeNull();
  });

  it("rejects unknown presets", () => {
    const project = withClips(emptyProject(), videoClip("c", 0, 4));
    expect(() => setAnimation(project, "c", "in", anim("nope"))).toThrow(/Unknown animation/);
  });
});

describe("loop animations", () => {
  it("cycles for the whole clip with the animation's duration as the period", () => {
    const c = clip({ animationLoop: anim("pulse", 1) });
    expect(animationStateAt(c, 10).motion.scale).toBeCloseTo(1);
    expect(animationStateAt(c, 10.25).motion.scale).toBeGreaterThan(1);
    expect(animationStateAt(c, 13.25).motion.scale).toBeCloseTo(
      animationStateAt(c, 10.25).motion.scale,
    );
  });

  it("stacks with enter animations", () => {
    const c = clip({ animationIn: anim("fade", 2), animationLoop: anim("float", 1) });
    const state = animationStateAt(c, 10.25);
    expect(state.motion.opacity).toBeLessThan(1);
    expect(state.motion.dy).not.toBe(0);
  });

  it("keeps loop presets out of the enter/exit slots and vice versa", () => {
    const project = withClips(emptyProject(), videoClip("c", 0, 4));
    expect(() => setAnimation(project, "c", "in", anim("pulse"))).toThrow(/loop/);
    expect(() => setAnimation(project, "c", "loop", anim("fade"))).toThrow(/loop/);
    expect(
      setAnimation(project, "c", "loop", anim("wiggle", 0.5)).clips.c?.animationLoop?.presetId,
    ).toBe("wiggle");
  });

  it("offers the creator-favourite enter presets", () => {
    for (const id of [
      "elastic",
      "bounce",
      "shake",
      "flicker",
      "pulse",
      "breathe",
      "float",
      "wiggle",
      "heartbeat",
      "spinLoop",
    ]) {
      expect(ANIMATION_PRESETS[id]).toBeDefined();
    }
  });
});
