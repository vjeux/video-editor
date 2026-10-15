import { applyTransition } from "../../app/effects";
import type { Id } from "../../core/types";
import { allEffects } from "../../effects/resolve";
import { useEditor } from "../../store";
import { Select } from "../controls/Select";
import { groupByCategory } from "./effect-stack";

/** Chooses which transition plays on the cut into `clipId`, keeping its duration. */
export function TransitionPicker({
  clipId,
  value,
  duration,
}: {
  clipId: Id;
  value: string | undefined;
  duration: number | undefined;
}) {
  const customEffects = useEditor((s) => s.project.customEffects);
  const categories = groupByCategory(allEffects({ customEffects }), "transition", "");
  return (
    <Select
      label="Transition"
      value={value ?? ""}
      placeholder={value ? "Missing transition" : "Choose a transition…"}
      options={categories.map((c) => ({
        group: c.name,
        options: c.effects.map((def) => ({ value: def.id, label: def.name })),
      }))}
      onChange={(id) => applyTransition(clipId, id, duration)}
    />
  );
}
