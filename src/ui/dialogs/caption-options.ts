import type { CaptionOptions } from "../../core/captions";

/** Languages Whisper handles well, by ISO 639-1 code. */
export const CAPTION_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
] as const;

/** Words on screen at once: 1–3 is the short-form "one beat at a time" style. */
export const WORDS_PER_CAPTION = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "5", label: "5" },
  { value: "8", label: "8" },
] as const;

export const BASE_CAPTION_OPTIONS: Omit<
  CaptionOptions,
  "maxWords" | "uppercase" | "stripPunctuation"
> = {
  maxChars: 32,
  maxGap: 0.6,
  hold: 0.4,
};
