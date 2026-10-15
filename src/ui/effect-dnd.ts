/** DataTransfer type carrying an effect or transition id from the library to clips and cuts. */
export const EFFECT_MIME = "application/x-cutline-effect";
/** Second type carrying the kind, readable during dragover (data itself is not). */
export const effectKindMime = (kind: "effect" | "transition") => `application/x-cutline-${kind}`;
