import { describe, expect, it } from "vite-plus/test";
import { createMediaClip, DEFAULT_MEDIA_APPEARANCE, DEFAULT_MEDIA_BORDER } from "./factories";
import {
  emptyProject,
  imageAsset,
  sequentialIds,
  videoAsset,
  withClips,
} from "./fixtures.test-utils";
import { migrateProject } from "./migrate";
import { packProject, unpackProject } from "./project-file";
import { readProject } from "./project-validation";
import { runScript } from "./script";
import type { MediaAppearance } from "./types";
import { splitClip } from "./timeline";

const appearance: MediaAppearance = {
  ...DEFAULT_MEDIA_APPEARANCE,
  radius: 120,
  background: { type: "linear", color: "#ffffff", color2: "#ffaa00", angle: 45 },
  padding: { top: 40, right: 20, bottom: 50, left: 20, linked: false },
  crop: { top: 0.1, right: 0.2, bottom: 0.05, left: 0.15 },
  aspect: 1,
  fit: "cover",
  position: { x: 0.25, y: 0.75 },
  mask: { ...DEFAULT_MEDIA_APPEARANCE.mask, shape: "custom" },
  feather: 12,
  blendMode: "multiply",
  innerShadow: { color: "#000000", blur: 20, x: -4, y: 8 },
  glow: { color: "#ff00ff", blur: 24 },
  border: { ...DEFAULT_MEDIA_BORDER, color: "rgba(255, 255, 255, 0.6)", width: 12 },
  shadow: { color: "rgba(0, 0, 0, 0.4)", blur: 32, x: -20, y: 40 },
};
const fixture = () =>
  withClips(
    emptyProject(),
    ...[videoAsset, imageAsset].map((asset, i) => ({
      ...createMediaClip(asset, { id: `clip-${i}`, trackId: "V1", start: i * 20 }),
      appearance,
    })),
  );

describe("media appearance", () => {
  it("keeps older video and image clips visually unchanged", () => {
    const raw = JSON.parse(JSON.stringify(fixture()));
    for (const clip of Object.values(raw.clips) as Record<string, unknown>[])
      delete clip.appearance;
    const restored = readProject(raw);
    for (const clip of Object.values(restored.clips))
      expect(clip.type === "media" && clip.appearance).toEqual(DEFAULT_MEDIA_APPEARANCE);
  });

  it("upgrades the original radius/border/shadow controls without changing their values", () => {
    const raw = JSON.parse(JSON.stringify(fixture()));
    for (const clip of Object.values(raw.clips) as Record<string, unknown>[])
      clip.appearance = { radius: 30, border: { color: "red", width: 16 }, shadow: null };
    const restored = readProject(raw);
    expect(restored.clips["clip-0"]).toMatchObject({
      appearance: {
        ...DEFAULT_MEDIA_APPEARANCE,
        radius: 30,
        border: { ...DEFAULT_MEDIA_BORDER, color: "red", width: 16 },
      },
    });
  });

  it("preserves styling through migration and portable project round-trips", async () => {
    const project = fixture();
    expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
    const file = await packProject(project, async () => new Blob(["source"]));
    expect((await unpackProject(file)).project).toEqual(project);
  });

  it.each([
    { ...appearance, radius: -1 },
    { ...appearance, crop: { ...appearance.crop, left: 0.8, right: 0.2 } },
    { ...appearance, padding: { ...appearance.padding, top: -1 } },
    { ...appearance, position: { x: 2, y: 0 } },
    { ...appearance, aspect: 0 },
    { ...appearance, mask: { shape: "custom", points: [{ x: 0, y: 0 }] } },
    { ...appearance, feather: -1 },
    { ...appearance, blendMode: "destination-out" },
    { ...appearance, border: { ...appearance.border, style: "unknown" } },
    { ...appearance, background: { ...appearance.background, angle: Infinity } },
    { ...appearance, innerShadow: { ...appearance.innerShadow, blur: -1 } },
    { ...appearance, glow: { color: "red", blur: -1 } },
    { ...appearance, radius: "round" },
    { ...appearance, border: { color: "red", width: -2 } },
    { ...appearance, shadow: { ...appearance.shadow, blur: -1 } },
    { ...appearance, shadow: { ...appearance.shadow, x: Infinity } },
  ])("rejects invalid imported frame settings: %o", (invalid) => {
    const project = fixture();
    const clip = project.clips["clip-0"]!;
    expect(() =>
      readProject({
        ...project,
        clips: { ...project.clips, [clip.id]: { ...clip, appearance: invalid } },
      }),
    ).toThrow("invalid settings or clips");
  });

  it("retains appearance on both sides of a split", () => {
    const split = splitClip(fixture(), "clip-0", 5, sequentialIds());
    for (const clip of Object.values(split.clips))
      expect(clip.type === "media" && clip.appearance).toEqual(appearance);
  });

  it("merges partial script edits and keeps styling when cloning", async () => {
    const { project, error } = await runScript(
      fixture(),
      `const clip = timeline.clips({ type: "video" })[0];
       clip.set({ appearance: { radius: 48, crop: { left: 0.1 }, border: { width: 20 } } });
       clip.clone({ start: 40, appearance: { radius: 72 } });`,
      sequentialIds(),
    );
    expect(error).toBeNull();
    expect(project.clips["clip-0"]).toMatchObject({
      appearance: {
        ...appearance,
        radius: 48,
        crop: { ...appearance.crop, left: 0.1 },
        border: { ...appearance.border, width: 20 },
      },
    });
    const clone = Object.values(project.clips).find((c) => c.start === 40);
    expect(clone).toMatchObject({
      appearance: {
        ...appearance,
        radius: 72,
        crop: { ...appearance.crop, left: 0.1 },
        border: { ...appearance.border, width: 20 },
      },
    });
  });
});
