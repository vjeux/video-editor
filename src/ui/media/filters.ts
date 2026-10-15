import type { Asset, AssetKind } from "../../core/types";

export type MediaFilter = "all" | AssetKind;

export const MEDIA_FILTERS: readonly { value: MediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "image", label: "Images" },
];

export const matchesMedia = (asset: Asset, filter: MediaFilter, query: string) =>
  (filter === "all" || asset.kind === filter) &&
  asset.name.toLowerCase().includes(query.trim().toLowerCase());
