import type { ParamDef, ParamType, ParamValue, Params } from "../../core/types";

const FITS: Record<ParamType, (value: ParamValue) => boolean> = {
  float: (v) => typeof v === "number",
  int: (v) => typeof v === "number",
  bool: (v) => typeof v === "boolean",
  color: (v) => typeof v === "string",
  vec2: (v) => Array.isArray(v),
};

/** Values for `defs`: the user's tweaks where they still fit the parameter, else defaults. */
export const paramValues = (defs: readonly ParamDef[], tweaks: Params): Params =>
  Object.fromEntries(
    defs.map((def) => {
      const tweak = tweaks[def.key];
      return [def.key, tweak !== undefined && FITS[def.type](tweak) ? tweak : def.default];
    }),
  );
