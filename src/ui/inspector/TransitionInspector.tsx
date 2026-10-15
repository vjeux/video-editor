import * as stylex from "@stylexjs/stylex";
import { clearTransition, updateTransition } from "../../app/effects";
import { previousAdjacent } from "../../core/effects";
import type { Id } from "../../core/types";
import { resolveEffect } from "../../effects/resolve";
import { useEditor } from "../../store";
import { Button } from "../controls/Button";
import { Icon } from "../controls/Icon";
import { ParamControl } from "../controls/ParamControl";
import { Row } from "../controls/Row";
import { SliderRow } from "../controls/SliderRow";
import { colors } from "../theme/tokens.stylex";
import { openInStudio, studioLabel } from "./effect-stack";
import { Group } from "./Group";
import { TransitionHeader } from "./TransitionHeader";
import { TransitionPicker } from "./TransitionPicker";

const styles = stylex.create({
  actions: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 },
  hint: { margin: 0, color: colors.faint, fontSize: 11.5, lineHeight: 1.6 },
});

/** The transition on the cut into `clipId`: type, duration, parameters. */
export function TransitionInspector({ clipId }: { clipId: Id }) {
  const clip = useEditor((s) => s.project.clips[clipId]);
  const from = useEditor((s) => {
    const to = s.project.clips[clipId];
    return to && previousAdjacent(s.project, to);
  });
  const transition = clip?.transitionIn ?? null;
  const def = useEditor((s) => transition && resolveEffect(s.project, transition.effectId));
  const custom = useEditor((s) => !!transition && transition.effectId in s.project.customEffects);
  if (!clip) return null;
  if (!from) {
    return (
      <Group title="Transition">
        <p {...stylex.props(styles.hint)}>
          This cut no longer exists: the clips on either side were moved apart.
        </p>
      </Group>
    );
  }
  const max = Math.max(0.1, Math.min(5, from.duration, clip.duration));
  return (
    <>
      <TransitionHeader from={from} to={clip} />
      <Group title="Transition">
        <Row label="Type" wide>
          <TransitionPicker clipId={clipId} value={def?.id} duration={transition?.duration} />
        </Row>
        {transition && def && (
          <SliderRow
            label="Duration"
            value={transition.duration}
            min={0.1}
            max={max}
            precision={2}
            suffix="s"
            onChange={(duration, k) => updateTransition(clipId, { duration }, `${clipId}:${k}`)}
          />
        )}
        {transition && !def && (
          <p {...stylex.props(styles.hint)}>
            “{transition.effectId}” is no longer available. Pick another transition or remove it.
          </p>
        )}
        {transition && (
          <div {...stylex.props(styles.actions)}>
            {def && (
              <Button onClick={() => openInStudio(def.id, custom)}>
                <Icon name="code" size={13} />
                {studioLabel(custom)}
              </Button>
            )}
            <Button variant="danger" onClick={() => clearTransition(clipId)}>
              <Icon name="trash" size={13} />
              Remove
            </Button>
          </div>
        )}
      </Group>
      {def && def.params.length > 0 && transition && (
        <Group title="Parameters">
          {def.params.map((p) => (
            <ParamControl
              key={p.key}
              def={p}
              value={transition.params[p.key]}
              onChange={(value, k) =>
                updateTransition(
                  clipId,
                  { params: { [p.key]: value } },
                  k && `${clipId}:transition:${k}`,
                )
              }
            />
          ))}
        </Group>
      )}
    </>
  );
}
