/** A symbol the shader wrapper provides to user code (see `fragmentSource` in engine/gpu). */
export interface HostSymbol {
  label: string;
  kind: "function" | "variable";
  signature: string;
  info: string;
}

/** The host contract, shared by autocomplete and the in-studio reference. */
export const HOST_API: readonly HostSymbol[] = [
  {
    label: "getColor",
    kind: "function",
    signature: "vec4 getColor(vec2 uv)",
    info: "The clip's pixel at uv (effects).",
  },
  {
    label: "getFromColor",
    kind: "function",
    signature: "vec4 getFromColor(vec2 uv)",
    info: "The outgoing clip's pixel at uv (transitions).",
  },
  {
    label: "getToColor",
    kind: "function",
    signature: "vec4 getToColor(vec2 uv)",
    info: "The incoming clip's pixel at uv (transitions).",
  },
  {
    label: "applyLut",
    kind: "function",
    signature: "vec3 applyLut(vec3 color)",
    info: "Looks a colour up in the effect's 3D LUT (imported .cube effects).",
  },
  {
    label: "progress",
    kind: "variable",
    signature: "float progress",
    info: "0 → 1 across a transition, or across the clip for effects.",
  },
  {
    label: "time",
    kind: "variable",
    signature: "float time",
    info: "Seconds since the clip (or the incoming clip) started.",
  },
  {
    label: "ratio",
    kind: "variable",
    signature: "float ratio",
    info: "Frame aspect ratio, width / height.",
  },
  {
    label: "resolution",
    kind: "variable",
    signature: "vec2 resolution",
    info: "Frame size in project pixels.",
  },
];
