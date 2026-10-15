import { useState } from "react";
import { ANIMATION_PRESETS } from "../../core/clip-animations";
import { ANIMATION_FILTERS, matchesPreset, type AnimationFilter } from "./animation-groups";
import { AnimationTile } from "./AnimationTile";
import { BrowserFrame } from "./BrowserFrame";
import { CategoryChips } from "./CategoryChips";

const PRESETS = Object.values(ANIMATION_PRESETS);

export function AnimationBrowser() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AnimationFilter>("all");
  const visible = PRESETS.filter((p) => matchesPreset(p, filter, query));

  return (
    <BrowserFrame
      title="Animations"
      query={query}
      onQuery={setQuery}
      filters={<CategoryChips options={ANIMATION_FILTERS} value={filter} onChange={setFilter} />}
      empty={visible.length === 0 ? "No animations match." : null}
    >
      {visible.map((preset) => (
        <AnimationTile key={preset.id} preset={preset} />
      ))}
    </BrowserFrame>
  );
}
