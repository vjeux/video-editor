import { describe, expect, it } from "vite-plus/test";
import { createProject } from "./factories";
import { emptyProject, sequentialIds, textClip, videoClip, withClips } from "./fixtures.test-utils";
import { packProject, projectFilename, rekeyBundle, unpackProject } from "./project-file";
import { definitionFromSource } from "./shader-source";

const source = new Blob([new Uint8Array([0, 255, 4, 10, 128])], { type: "video/mp4" });
const load = async () => source;
const fixture = () => {
  const project = withClips(emptyProject(), videoClip("video", 0, 5), textClip("title", 0, 4));
  const effect = definitionFromSource(
    "vec4 effect(vec2 uv) { return texture(u_image, uv); }",
    "custom-look",
  );
  return {
    ...project,
    name: "Été 🎬",
    markers: [{ id: "marker", time: 2, label: "Cut" }],
    customEffects: { [effect.id]: effect },
  };
};

async function rewrite(file: Blob, change: (manifest: any) => void) {
  const bytes = await file.slice(0, 12).arrayBuffer();
  const length = new DataView(bytes).getUint32(8, true);
  const manifest = JSON.parse(await file.slice(12, 12 + length).text());
  change(manifest);
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  new DataView(bytes).setUint32(8, json.byteLength, true);
  return new Blob([bytes, json, file.slice(12 + length)]);
}

describe("portable Cutline projects", () => {
  it("round-trips edits, custom shaders, Unicode names and original binary media", async () => {
    const project = fixture();
    const file = await packProject(project, load);
    const restored = await unpackProject(file);
    expect(restored.project).toEqual(project);
    expect(restored.media.size).toBe(3);
    for (const media of restored.media.values()) {
      expect(media.type).toBe(source.type);
      expect(await media.arrayBuffer()).toEqual(await source.arrayBuffer());
    }
  });

  it("saves an empty project without requiring media", async () => {
    const project = createProject({ name: "Empty" });
    expect(
      (await unpackProject(await packProject(project, async () => undefined))).project,
    ).toEqual(project);
  });

  it("refuses to silently omit a missing source", async () => {
    await expect(packProject(fixture(), async () => undefined)).rejects.toThrow("sunset.mp4");
  });

  it("migrates older project schemas inside the container", async () => {
    const file = await rewrite(await packProject(fixture(), load), (m) => {
      m.project.version = 3;
      delete m.project.clips.title.style.glow;
    });
    const restored = await unpackProject(file);
    expect(restored.project.version).toBe(4);
    expect(restored.project.clips.title).toMatchObject({ style: { glow: null } });
  });

  it("rejects unknown container versions and non-project files", async () => {
    await expect(unpackProject(new Blob(["Not a Cutline project"]))).rejects.toThrow(
      "not a Cutline",
    );
    const file = await rewrite(await packProject(fixture(), load), (m) => {
      m.version = 99;
    });
    await expect(unpackProject(file)).rejects.toThrow("unsupported format");
  });

  it("rejects truncated payloads, trailing bytes and invalid manifest lengths", async () => {
    const file = await packProject(fixture(), load);
    await expect(unpackProject(file.slice(0, -1))).rejects.toThrow("incomplete");
    await expect(unpackProject(new Blob([file, "extra"]))).rejects.toThrow("incomplete");
    const header = await file.slice(0, 12).arrayBuffer();
    new DataView(header).setUint32(8, 0xffffffff, true);
    await expect(unpackProject(new Blob([header, file.slice(12)]))).rejects.toThrow("damaged");
  });

  it("rejects missing and duplicate media entries", async () => {
    const original = await packProject(fixture(), load);
    const duplicate = await rewrite(original, (m) => {
      m.media[1].id = m.media[0].id;
    });
    await expect(unpackProject(duplicate)).rejects.toThrow("media is incomplete");
    const missing = await rewrite(original, (m) => {
      m.media.pop();
    });
    await expect(unpackProject(missing)).rejects.toThrow("media is incomplete");
  });

  it("rejects broken clip references and invalid nested text settings", async () => {
    const original = await packProject(fixture(), load);
    const reference = await rewrite(original, (m) => {
      m.project.clips.video.assetId = "missing";
    });
    await expect(unpackProject(reference)).rejects.toThrow("invalid references");
    const style = await rewrite(original, (m) => {
      m.project.clips.title.style.fontSize = "large";
    });
    await expect(unpackProject(style)).rejects.toThrow("invalid settings or clips");
  });

  it("rekeys media and references without touching the previous bundle", async () => {
    const original = await unpackProject(await packProject(fixture(), load));
    const remapped = rekeyBundle(original, sequentialIds("fresh"));
    expect(Object.keys(remapped.project.assets)).toEqual(["fresh-1", "fresh-2", "fresh-3"]);
    expect(remapped.project.clips.video).toMatchObject({ assetId: "fresh-1" });
    expect(remapped.media.get("fresh-1")).toBe(original.media.get("a-video"));
    expect(original.project.clips.video).toMatchObject({ assetId: "a-video" });
  });

  it("uses safe, nonempty filenames with one extension", () => {
    expect(projectFilename("My / film.cutline")).toBe("My - film.cutline");
    expect(projectFilename("  ")).toBe("Untitled project.cutline");
  });
});
