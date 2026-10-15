import type { AnimationPreset } from "../../core/clip-animations";

export type AnimationFilter = "all" | AnimationPreset["group"];

export const ANIMATION_FILTERS: readonly { value: AnimationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "motion", label: "Motion" },
  { value: "reveal", label: "Reveal" },
];

export const matchesPreset = (preset: AnimationPreset, filter: AnimationFilter, query: string) =>
  (filter === "all" || preset.group === filter) &&
  preset.name.toLowerCase().includes(query.trim().toLowerCase());
