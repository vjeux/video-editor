import { setAnimation } from "./clip-animations";
import { addEffect, setTransition, updateEffect } from "./effects";
import { createAdjustmentClip, createMediaClip, createTextClip } from "./factories";
import {
  clipEnd,
  clipKind,
  findClip,
  moveClip,
  placeClip,
  projectDuration,
  removeClips,
  splitClip,
  trackEnd,
  trimClip,
} from "./timeline";
import { trackFor, trackLabel } from "./tracks";
import type {
  Clip,
  ClipAnimation,
  ClipKind,
  EffectDefinition,
  EffectKind,
  Id,
  IdFactory,
  Params,
  Project,
  TextClip,
} from "./types";

export interface ScriptResult {
  project: Project;
  logs: string[];
  error: string | null;
}

type Patch = Record<string, unknown>;

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

const format = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

/** Shallow merge that also merges the nested `transform` and `style` objects. */
function merge(clip: Clip, patch: Patch): Clip {
  const { transform, style, ...rest } = patch;
  const merged = {
    ...clip,
    ...rest,
    transform: { ...clip.transform, ...(transform as Patch) },
  } as Clip;
  return merged.type === "text" && style
    ? { ...merged, style: { ...merged.style, ...(style as Patch) } }
    : merged;
}

/**
 * Runs user code against a draft of the project through the same pure
 * operations the UI uses. Returns the edited project for a single commit,
 * or the untouched project plus the error if the script throws.
 */
export async function runScript(
  project: Project,
  code: string,
  newId: IdFactory,
  catalog: readonly EffectDefinition[] = [],
): Promise<ScriptResult> {
  let draft = project;
  const logs: string[] = [];
  const log = (...values: unknown[]) => logs.push(values.map(format).join(" "));

  const trackId = (ref: string): Id => {
    const track = draft.tracks.find(
      (t) => t.id === ref || t.name === ref || trackLabel(draft, t.id) === ref.toUpperCase(),
    );
    if (!track) throw new Error(`No track "${ref}"`);
    return track.id;
  };

  const assetId = (ref: string): Id => {
    const asset = Object.values(draft.assets).find((a) => a.id === ref || a.name === ref);
    if (!asset) throw new Error(`No asset "${ref}"`);
    return asset.id;
  };

  const place = (clip: Clip) => {
    draft = placeClip(draft, clip, newId);
    return handle(clip.id);
  };

  const handle = (id: Id) => {
    const clip = () => findClip(draft, id);
    return {
      id,
      get type(): ClipKind {
        return clipKind(draft, clip());
      },
      get start() {
        return clip().start;
      },
      get duration() {
        return clip().duration;
      },
      get end() {
        return clipEnd(clip());
      },
      get track() {
        return trackLabel(draft, clip().trackId);
      },
      get text() {
        const c = clip();
        return c.type === "text" ? c.text : null;
      },
      get asset() {
        const c = clip();
        return c.type === "media" ? (draft.assets[c.assetId]?.name ?? null) : null;
      },
      set(patch: Patch) {
        draft = { ...draft, clips: { ...draft.clips, [id]: merge(clip(), patch) } };
        return this;
      },
      move(start: number, track?: string) {
        draft = moveClip(
          draft,
          id,
          { start, trackId: track ? trackId(track) : clip().trackId },
          newId,
        );
        return this;
      },
      trim(start?: number, end?: number) {
        if (start !== undefined) draft = trimClip(draft, id, "start", start);
        if (end !== undefined) draft = trimClip(draft, id, "end", end);
        return this;
      },
      split(time: number) {
        const before = new Set(Object.keys(draft.clips));
        draft = splitClip(draft, id, time, newId);
        const created = Object.keys(draft.clips).find((k) => !before.has(k));
        return created ? handle(created) : null;
      },
      remove() {
        draft = removeClips(draft, [id]);
      },
      clone(overrides: Patch & { track?: string } = {}) {
        const { track, ...patch } = overrides;
        const source = clip();
        const copy = merge(
          { ...source, id: newId(), trackId: track ? trackId(track) : source.trackId },
          patch,
        );
        return place(copy);
      },
      addEffect(effect: string, params: Params = {}) {
        draft = addEffect(draft, [id], findEffect(effect, "effect"), newId);
        const added = clip().effects.at(-1);
        if (added) draft = updateEffect(draft, id, added.id, { params });
        return this;
      },
      setTransition(effect: string | null, options: { duration?: number } & Params = {}) {
        const { duration = 1, ...params } = options;
        draft = setTransition(
          draft,
          id,
          effect ? findEffect(effect, "transition") : null,
          duration,
        );
        const transition = clip().transitionIn;
        if (transition) {
          draft = {
            ...draft,
            clips: {
              ...draft.clips,
              [id]: {
                ...clip(),
                transitionIn: { ...transition, params: { ...transition.params, ...params } },
              },
            },
          };
        }
        return this;
      },
      animateIn(preset: string | null, options: Partial<ClipAnimation> = {}) {
        draft = setAnimation(draft, id, "in", preset ? animation(preset, options) : null);
        return this;
      },
      animateOut(preset: string | null, options: Partial<ClipAnimation> = {}) {
        draft = setAnimation(draft, id, "out", preset ? animation(preset, options) : null);
        return this;
      },
    };
  };

  const findEffect = (ref: string, kind: EffectKind): EffectDefinition => {
    const lower = ref.toLowerCase();
    const def = catalog.find(
      (d) => d.kind === kind && (d.id === ref || d.name.toLowerCase() === lower),
    );
    if (!def) throw new Error(`No ${kind === "effect" ? "effect" : "transition"} "${ref}"`);
    return def;
  };

  const animation = (presetId: string, options: Partial<ClipAnimation>): ClipAnimation => ({
    presetId,
    duration: options.duration ?? 0.5,
    easing: options.easing ?? "easeOut",
  });

  const timeline = {
    get duration() {
      return projectDuration(draft);
    },
    get fps() {
      return draft.settings.fps;
    },
    clips(filter: { type?: ClipKind; track?: string } = {}) {
      const track = filter.track ? trackId(filter.track) : null;
      const order = new Map(draft.tracks.map((t, i) => [t.id, i]));
      return Object.values(draft.clips)
        .filter(
          (c) =>
            (!filter.type || clipKind(draft, c) === filter.type) && (!track || c.trackId === track),
        )
        .sort(
          (a, b) => a.start - b.start || (order.get(a.trackId) ?? 0) - (order.get(b.trackId) ?? 0),
        )
        .map((c) => handle(c.id));
    },
    tracks() {
      return draft.tracks.map((t) => ({
        label: trackLabel(draft, t.id),
        name: t.name,
        kind: t.kind,
      }));
    },
    assets() {
      return Object.values(draft.assets).map(({ name, kind, duration }) => ({
        name,
        kind,
        duration,
      }));
    },
    add(asset: string, opts: { start?: number; track?: string } = {}) {
      const target = draft.assets[assetId(asset)];
      if (!target) throw new Error(`No asset "${asset}"`);
      const routed = opts.track
        ? { project: draft, trackId: trackId(opts.track) }
        : trackFor(draft, target.kind, newId);
      draft = routed.project;
      const start = opts.start ?? trackEnd(draft, routed.trackId);
      return place(createMediaClip(target, { id: newId(), trackId: routed.trackId, start }));
    },
    addText(
      text: string,
      opts: Patch & { start?: number; track?: string; x?: number; y?: number } = {},
    ) {
      const { start = 0, track, x, y, ...patch } = opts;
      const routed = track
        ? { project: draft, trackId: trackId(track) }
        : trackFor(draft, "text", newId);
      draft = routed.project;
      const base: TextClip = createTextClip({ id: newId(), trackId: routed.trackId, start, text });
      const transform = { ...(x !== undefined && { x }), ...(y !== undefined && { y }) };
      return place(merge(base, { ...patch, transform }));
    },
    effects() {
      return catalog.map(({ id, name, kind, category }) => ({ id, name, kind, category }));
    },
    addAdjustment(opts: { start?: number; duration?: number; track?: string } = {}) {
      const routed = opts.track
        ? { project: draft, trackId: trackId(opts.track) }
        : trackFor(draft, "adjustment", newId);
      draft = routed.project;
      const base = createAdjustmentClip({
        id: newId(),
        trackId: routed.trackId,
        start: opts.start ?? 0,
      });
      return place({ ...base, duration: opts.duration ?? base.duration });
    },
    addMarker(time: number, label = "") {
      draft = {
        ...draft,
        markers: [...draft.markers, { id: newId(), time, label }].sort((a, b) => a.time - b.time),
      };
    },
  };

  try {
    await new AsyncFunction("timeline", "log", code)(timeline, log);
    return { project: draft, logs, error: null };
  } catch (error) {
    return { project, logs, error: error instanceof Error ? error.message : String(error) };
  }
}
