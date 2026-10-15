import type { AdjustmentClip } from "../../core/types";
import { AnimationGroup } from "./AnimationGroup";
import { EffectsGroup } from "./EffectsGroup";
import { FadeGroup } from "./FadeGroup";

/** An adjustment layer has no content of its own: just effects, fades and animations. */
export function AdjustmentInspector({ clip }: { clip: AdjustmentClip }) {
  return (
    <>
      <EffectsGroup clip={clip} />
      <FadeGroup clip={clip} />
      <AnimationGroup clip={clip} />
    </>
  );
}
