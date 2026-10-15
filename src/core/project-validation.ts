import { migrateProject } from "./migrate";
import type { Project } from "./types";

type Check = (value: unknown) => boolean;
type Raw = Record<string, unknown>;
const record = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const text: Check = (v) => typeof v === "string";
const number: Check = (v) => typeof v === "number" && Number.isFinite(v);
const positive: Check = (v) => number(v) && (v as number) > 0;
const nonnegative: Check = (v) => number(v) && (v as number) >= 0;
const unit: Check = (v) => nonnegative(v) && (v as number) <= 1;
const bool: Check = (v) => typeof v === "boolean";
const oneOf =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const array =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    record(v) && Object.entries(fields).every(([key, check]) => check(v[key]));
const dictionary =
  (check: Check): Check =>
  (v) =>
    record(v) && Object.values(v).every(check);
const parameter: Check = (v) =>
  text(v) || number(v) || bool(v) || (Array.isArray(v) && v.length === 2 && v.every(number));
const params = dictionary(parameter);
const instance = shape({ id: text, effectId: text, enabled: bool, params });
const easing = oneOf("linear", "easeOut", "easeInOut", "backOut", "bounceOut", "elasticOut");
const animation = nullable(shape({ presetId: text, duration: positive, easing }));
const frameShadow = shape({ color: text, blur: nonnegative, x: number, y: number });
const insets = (check: Check) => shape({ top: check, right: check, bottom: check, left: check });
const point = shape({ x: unit, y: unit });
const appearance = shape({
  radius: nonnegative,
  background: nullable(
    shape({ type: oneOf("solid", "linear"), color: text, color2: text, angle: number }),
  ),
  padding: (v) => insets(nonnegative)(v) && shape({ linked: bool })(v),
  crop: (v) =>
    insets(unit)(v) &&
    record(v) &&
    (v.left as number) + (v.right as number) < 1 &&
    (v.top as number) + (v.bottom as number) < 1,
  aspect: nullable(positive),
  fit: oneOf("contain", "cover"),
  position: point,
  mask: shape({
    shape: oneOf("rectangle", "circle", "ellipse", "diamond", "hexagon", "custom"),
    points: (v) => Array.isArray(v) && v.length >= 3 && v.length <= 32 && v.every(point),
  }),
  feather: nonnegative,
  blendMode: oneOf(
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "soft-light",
    "hard-light",
    "difference",
    "exclusion",
  ),
  border: nullable(
    shape({
      color: text,
      width: nonnegative,
      style: oneOf("solid", "dashed", "dotted", "double", "gradient"),
      color2: text,
      angle: number,
    }),
  ),
  shadow: nullable(frameShadow),
  innerShadow: nullable(frameShadow),
  glow: nullable(shape({ color: text, blur: nonnegative })),
});
const style = shape({
  fontFamily: text,
  fontWeight: positive,
  fontSize: positive,
  letterSpacing: number,
  color: text,
  align: oneOf("left", "center", "right"),
  background: nullable(text),
  stroke: nullable(shape({ color: text, width: nonnegative })),
  shadow: nullable(shape({ color: text, blur: nonnegative, x: number, y: number })),
  glow: nullable(shape({ color: text, size: nonnegative })),
  gradient: nullable(shape({ from: text, to: text, angle: number })),
  highlight: nullable(shape({ color: text, mode: oneOf("line", "word"), padding: nonnegative })),
  shine: nullable(shape({ color: text, period: positive })),
});
const clipBase = shape({
  id: text,
  trackId: text,
  start: nonnegative,
  duration: positive,
  fadeIn: nonnegative,
  fadeOut: nonnegative,
  transform: shape({
    x: number,
    y: number,
    scale: positive,
    rotation: number,
    opacity: nonnegative,
  }),
  effects: array(instance),
  transitionIn: nullable(shape({ effectId: text, duration: nonnegative, params })),
  animationIn: animation,
  animationOut: animation,
  animationLoop: animation,
});
const clip: Check = (v) => {
  if (!record(v) || !clipBase(v)) return false;
  if (v.type === "adjustment") return true;
  if (v.type === "media")
    return shape({
      assetId: text,
      offset: nonnegative,
      speed: positive,
      volume: nonnegative,
      speedRamp: nullable(text),
      audioEffects: array(instance),
      appearance,
    })(v);
  return (
    v.type === "text" &&
    shape({
      text,
      style,
      animation: oneOf("none", "fade", "rise", "type", "blur"),
      textMotion: nullable(
        shape({
          presetId: text,
          unit: oneOf("letter", "word", "line"),
          duration: positive,
          stagger: nonnegative,
          easing,
        }),
      ),
      karaoke: nullable(shape({ color: text, mode: oneOf("fill", "pop", "box") })),
      words: nullable(array(shape({ text, start: nonnegative, end: nonnegative }))),
    })(v)
  );
};
const effect = shape({
  id: text,
  name: text,
  kind: oneOf("effect", "transition"),
  category: text,
  description: text,
  author: text,
  source: text,
  params: array(
    shape({
      key: text,
      label: text,
      type: oneOf("float", "int", "bool", "color", "vec2"),
      default: parameter,
    }),
  ),
  lut: nullable(
    shape({
      size: (v) => Number.isInteger(v) && (v as number) >= 2 && (v as number) <= 64,
      data: text,
    }),
  ),
});
const projectShape = shape({
  name: text,
  settings: shape({ width: positive, height: positive, fps: positive, background: text }),
  assets: dictionary(
    shape({
      id: text,
      name: text,
      kind: oneOf("video", "audio", "image"),
      duration: nullable(nonnegative),
      width: nonnegative,
      height: nonnegative,
      hasAudio: bool,
    }),
  ),
  tracks: array(
    shape({
      id: text,
      name: text,
      kind: oneOf("video", "audio", "text"),
      muted: bool,
      solo: bool,
      hidden: bool,
      locked: bool,
    }),
  ),
  clips: dictionary(clip),
  markers: array(shape({ id: text, time: nonnegative, label: text })),
  customEffects: dictionary(effect),
});

/** Validate external project data before it can replace the working timeline. */
export function readProject(raw: unknown): Project {
  if (!record(raw)) throw new Error("The Cutline project data is invalid");
  const project = migrateProject(raw);
  if (!projectShape(project))
    throw new Error("The Cutline project contains invalid settings or clips");
  const trackIds = new Set(project.tracks.map((t) => t.id));
  const validId = (id: string) =>
    id.length > 0 && !["__proto__", "constructor", "prototype"].includes(id);
  const records = [project.assets, project.clips, project.customEffects];
  if (
    trackIds.size !== project.tracks.length ||
    [...trackIds].some((id) => !validId(id)) ||
    records.some((entries) =>
      Object.entries(entries).some(([id, entry]) => !validId(id) || entry.id !== id),
    ) ||
    Object.values(project.clips).some(
      (c) =>
        !trackIds.has(c.trackId) ||
        (c.type === "media" && !Object.hasOwn(project.assets, c.assetId)),
    ) ||
    project.settings.width > 7680 ||
    project.settings.height > 7680 ||
    project.settings.fps > 240
  )
    throw new Error("The Cutline project contains invalid references or canvas dimensions");
  return project;
}
