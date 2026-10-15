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
      onChange={(id) => id && applyTransition(clipId, id, duration)}
    >
      <option value="" disabled>
        {value ? "Missing transition" : "Choose a transition…"}
      </option>
      {categories.map((c) => (
        <optgroup key={c.name} label={c.name}>
          {c.effects.map((def) => (
            <option key={def.id} value={def.id}>
              {def.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
