export type LibraryTab = "media" | "effects" | "transitions" | "animations";

export const LIBRARY_TABS: readonly { value: LibraryTab; label: string }[] = [
  { value: "media", label: "Media" },
  { value: "effects", label: "Effects" },
  { value: "transitions", label: "Transitions" },
  { value: "animations", label: "Animations" },
];
