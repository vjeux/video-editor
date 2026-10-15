import { sampleFrames } from "../../app/sample-frames";
import type { Drawable } from "../../engine/compositor";
import type { EditorState } from "../../store/editor";

export const PREVIEW_WIDTH = 480;
export const PREVIEW_HEIGHT = 270;

const covered = new WeakMap<ImageBitmap, OffscreenCanvas>();

/** A poster scaled to cover the 16:9 preview frame, cached per bitmap. */
function coverFrame(image: ImageBitmap): OffscreenCanvas {
  const cached = covered.get(image);
  if (cached) return cached;
  const canvas = new OffscreenCanvas(PREVIEW_WIDTH, PREVIEW_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a preview canvas");
  const scale = Math.max(PREVIEW_WIDTH / image.width, PREVIEW_HEIGHT / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (PREVIEW_WIDTH - width) / 2, (PREVIEW_HEIGHT - height) / 2, width, height);
  covered.set(image, canvas);
  return canvas;
}

/** The images the preview runs through the shader: [from, to]. A poster replaces "from". */
export function previewFrames(poster: ImageBitmap | undefined): [Drawable, Drawable] {
  const [from, to] = sampleFrames();
  return [poster ? coverFrame(poster) : from, to];
}

/** The asset behind the first selected media clip, if any. */
export const selectedMediaAssetId = (state: EditorState): string | undefined =>
  state.selection.map((id) => state.project.clips[id]).find((clip) => clip?.type === "media")
    ?.assetId;
