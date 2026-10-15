import { useDeferredValue, useState, type ReactNode } from "react";
import type { EffectKind } from "../../core/types";
import { useEditor } from "../../store";
import { BrowserFrame } from "./BrowserFrame";
import { ALL, categoriesOf, definitionsOf, matchesDefinition } from "./catalog";
import { CategoryChips } from "./CategoryChips";
import { EffectTile } from "./EffectTile";

/** Searchable, category-filtered grid of the effects or transitions available to the project. */
export function EffectCatalog({
  kind,
  title,
  actions,
}: {
  kind: EffectKind;
  title: string;
  actions: ReactNode;
}) {
  const customEffects = useEditor((s) => s.project.customEffects);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(ALL);

  const definitions = definitionsOf(customEffects, kind);
  const categories = categoriesOf(definitions);
  // A category can vanish (its last custom effect deleted); fall back to everything.
  const category = categories.includes(picked) ? picked : ALL;
  const deferredQuery = useDeferredValue(query);
  const visible = definitions.filter((d) => matchesDefinition(d, category, deferredQuery));

  return (
    <BrowserFrame
      title={title}
      actions={actions}
      query={query}
      onQuery={setQuery}
      filters={
        <CategoryChips
          options={categories.map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={setPicked}
        />
      }
      empty={visible.length === 0 ? `No ${title.toLowerCase()} match.` : null}
    >
      {visible.map((def) => (
        <EffectTile key={def.id} def={def} custom={def.id in customEffects} />
      ))}
    </BrowserFrame>
  );
}
