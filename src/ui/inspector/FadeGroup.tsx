import { updateClip } from "../../app/commands";
import type { Clip } from "../../core/types";
import { SliderRow } from "../controls/SliderRow";
import { Group } from "./Group";

export function FadeGroup({ clip }: { clip: Clip }) {
  const max = Math.max(0.1, Math.min(5, clip.duration / 2));
  return (
    <Group title="Fades">
      <SliderRow
        label="Fade in"
        value={clip.fadeIn}
        min={0}
        max={max}
        precision={2}
        suffix="s"
        onChange={(fadeIn, k) => updateClip(clip.id, (c) => ({ ...c, fadeIn }), k)}
      />
      <SliderRow
        label="Fade out"
        value={clip.fadeOut}
        min={0}
        max={max}
        precision={2}
        suffix="s"
        onChange={(fadeOut, k) => updateClip(clip.id, (c) => ({ ...c, fadeOut }), k)}
      />
    </Group>
  );
}
