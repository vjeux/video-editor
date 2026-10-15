import type { Clip, MediaClip, Seconds, TextAnimation, TextClip } from "./types";

export interface TextAnimationState {
  opacity: number;
  offsetY: number;
  blur: number;
  visibleChars: number;
}

const INTRO: Seconds = 0.6;
const TYPE_CHARS_PER_SECOND = 24;
const MAX_BLUR_PX = 24;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

export function fadeEnvelope(clip: Clip, t: Seconds): number {
  const local = t - clip.start;
  if (local < 0 || local > clip.duration) return 0;
  const fadeIn = clip.fadeIn > 0 ? local / clip.fadeIn : 1;
  const fadeOut = clip.fadeOut > 0 ? (clip.duration - local) / clip.fadeOut : 1;
  return clamp01(Math.min(fadeIn, fadeOut));
}

export function clipOpacityAt(clip: Clip, t: Seconds): number {
  return clip.transform.opacity * fadeEnvelope(clip, t);
}

export function gainAt(clip: MediaClip, t: Seconds): number {
  return clip.volume * fadeEnvelope(clip, t);
}

type AnimationFn = (eased: number, clip: TextClip, local: Seconds) => Partial<TextAnimationState>;

const TEXT_ANIMATIONS: Record<TextAnimation, AnimationFn> = {
  none: () => ({}),
  fade: (e) => ({ opacity: e }),
  rise: (e, clip) => ({ opacity: e, offsetY: (1 - e) * clip.style.fontSize * 0.6 }),
  blur: (e) => ({ opacity: e, blur: (1 - e) * MAX_BLUR_PX }),
  type: (_e, clip, local) => {
    const window = Math.min(clip.duration * 0.6, clip.text.length / TYPE_CHARS_PER_SECOND);
    const p = window > 0 ? clamp01(local / window) : 1;
    return { visibleChars: Math.floor(clip.text.length * p) };
  },
};

export function textAnimationState(clip: TextClip, t: Seconds): TextAnimationState {
  const local = t - clip.start;
  const intro = Math.min(INTRO, clip.duration / 2);
  const eased = easeOutCubic(intro > 0 ? clamp01(local / intro) : 1);
  return {
    opacity: 1,
    offsetY: 0,
    blur: 0,
    visibleChars: clip.text.length,
    ...TEXT_ANIMATIONS[clip.animation](eased, clip, local),
  };
}
