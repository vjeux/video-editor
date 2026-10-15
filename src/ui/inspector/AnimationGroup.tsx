import type { Clip } from "../../core/types";
import { AnimationRow } from "./AnimationRow";
import { Group } from "./Group";

/** Enter, exit and loop animations of a visual clip. */
export function AnimationGroup({ clip }: { clip: Clip }) {
  return (
    <Group title="Animation">
      <AnimationRow clip={clip} which="in" />
      <AnimationRow clip={clip} which="out" />
      <AnimationRow clip={clip} which="loop" />
    </Group>
  );
}
