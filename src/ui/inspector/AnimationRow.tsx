import * as stylex from "@stylexjs/stylex";
import { ANIMATION_PRESETS, EASINGS } from "../../core/clip-animations";
import type { Clip, ClipAnimation } from "../../core/types";
import { setClipAnimation } from "../../app/effects";
import { Row } from "../controls/Row";
import { Select } from "../controls/Select";
import { SliderRow } from "../controls/SliderRow";
import { ANIMATION_GROUPS, DEFAULT_ANIMATION_DURATION, EASING_LABELS } from "./options";

const styles = stylex.create({
  row: { marginBottom: { default: 12, ":last-child": 0 } },
});

const WHICH = {
  in: { label: "In", field: "animationIn", durationLabel: "Duration" },
  out: { label: "Out", field: "animationOut", durationLabel: "Duration" },
  loop: { label: "Loop", field: "animationLoop", durationLabel: "Period" },
} as const;

/** Preset, duration (or loop period) and easing of a clip's enter, exit or loop animation. */
export function AnimationRow({ clip, which }: { clip: Clip; which: "in" | "out" | "loop" }) {
  const { label, field, durationLabel } = WHICH[which];
  const animation = clip[field];
  const max = which === "loop" ? 4 : Math.max(0.1, Math.min(3, clip.duration));
  const set = (next: ClipAnimation | null, coalesce?: string) =>
    setClipAnimation(clip.id, which, next, coalesce);
  const pick = (presetId: string) =>
    set(
      presetId
        ? {
            presetId,
            duration: animation?.duration ?? Math.min(DEFAULT_ANIMATION_DURATION, max),
            easing: ANIMATION_PRESETS[presetId]?.easing ?? animation?.easing ?? "easeOut",
          }
        : null,
    );
  return (
    <div role="group" aria-label={`${label} animation`} {...stylex.props(styles.row)}>
      <Row label={label} wide>
        <Select
          label={`${label} animation`}
          value={animation?.presetId ?? ""}
          options={[
            { value: "", label: "None" },
            ...ANIMATION_GROUPS[which].map((g) => ({
              group: g.label,
              options: g.presets.map((p) => ({ value: p.id, label: p.name })),
            })),
          ]}
          onChange={pick}
        />
      </Row>
      {animation && (
        <>
          <SliderRow
            label={durationLabel}
            value={animation.duration}
            min={0.1}
            max={max}
            precision={2}
            suffix="s"
            onChange={(duration, k) => set({ ...animation, duration }, `${clip.id}:${which}:${k}`)}
          />
          {which !== "loop" && (
            <Row label="Easing" wide>
              <Select
                label={`${label} easing`}
                value={animation.easing}
                options={EASINGS.map((e) => ({ value: e, label: EASING_LABELS[e] }))}
                onChange={(easing) => set({ ...animation, easing })}
              />
            </Row>
          )}
        </>
      )}
    </div>
  );
}
