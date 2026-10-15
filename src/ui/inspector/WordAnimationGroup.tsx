import { updateClip } from "../../app/commands";
import { EASINGS } from "../../core/clip-animations";
import { TEXT_MOTION_PRESETS } from "../../core/text-motion";
import type { TextClip, TextMotion } from "../../core/types";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { SliderRow } from "../controls/SliderRow";
import { Group } from "./Group";
import { EASING_LABELS, TEXT_MOTION_GROUPS } from "./options";

const UNITS = [
  { value: "letter", label: "Letters" },
  { value: "word", label: "Words" },
  { value: "line", label: "Lines" },
] as const;

/** Letter-, word- or line-level animation: pop, slide, wave, typewriter… */
export function WordAnimationGroup({ clip }: { clip: TextClip }) {
  const motion = clip.textMotion;
  const set = (next: TextMotion | null, coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "text" ? { ...c, textMotion: next } : c),
      coalesce && `${clip.id}:${coalesce}`,
    );
  const pick = (presetId: string) => {
    const preset = TEXT_MOTION_PRESETS[presetId];
    if (!preset) return set(null);
    const continuous = preset.kind === "continuous";
    set({
      presetId,
      unit: motion?.unit ?? (presetId === "typewriter" ? "letter" : "word"),
      duration: continuous ? 1.2 : presetId === "typewriter" ? 0.01 : 0.35,
      stagger: continuous ? 0.12 : presetId === "typewriter" ? 0.05 : 0.08,
      easing: preset.easing ?? "easeOut",
    });
  };
  const continuous = motion && TEXT_MOTION_PRESETS[motion.presetId]?.kind === "continuous";
  return (
    <Group title="Word animation">
      <Row label="Preset" wide>
        <Select label="Word animation" value={motion?.presetId ?? ""} onChange={pick}>
          <option value="">None</option>
          {TEXT_MOTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Row>
      {motion && (
        <>
          <Row label="By" wide>
            <Segmented
              label="Animate by"
              value={motion.unit}
              options={UNITS}
              onChange={(unit) => set({ ...motion, unit })}
            />
          </Row>
          <SliderRow
            label={continuous ? "Period" : "Duration"}
            value={motion.duration}
            min={0.01}
            max={continuous ? 4 : 2}
            precision={2}
            suffix="s"
            onChange={(duration, k) => set({ ...motion, duration }, k)}
          />
          <SliderRow
            label={continuous ? "Offset" : "Stagger"}
            value={motion.stagger}
            min={0}
            max={0.6}
            precision={2}
            suffix="s"
            onChange={(stagger, k) => set({ ...motion, stagger }, k)}
          />
          {!continuous && (
            <Row label="Easing" wide>
              <Select
                label="Word animation easing"
                value={motion.easing}
                onChange={(v) => {
                  const easing = EASINGS.find((e) => e === v);
                  if (easing) set({ ...motion, easing });
                }}
              >
                {EASINGS.map((e) => (
                  <option key={e} value={e}>
                    {EASING_LABELS[e]}
                  </option>
                ))}
              </Select>
            </Row>
          )}
        </>
      )}
    </Group>
  );
}
