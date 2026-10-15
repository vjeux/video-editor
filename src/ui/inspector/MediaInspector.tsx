import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import { setClipSpeed } from "../../core/timeline";
import type { MediaClip } from "../../core/types";
import { useEditor } from "../../store";
import { Segmented } from "../controls/Segmented";
import { SliderRow } from "../controls/SliderRow";
import { colors } from "../theme/tokens.stylex";
import { AnimationGroup } from "./AnimationGroup";
import { AudioEffectsGroup } from "./AudioEffectsGroup";
import { CaptionsGroup } from "./CaptionsGroup";
import { SilenceGroup } from "./SilenceGroup";
import { EffectsGroup } from "./EffectsGroup";
import { SpeedRampRow } from "./SpeedRampRow";
import { FadeGroup } from "./FadeGroup";
import { Group } from "./Group";
import { PERCENT, SPEEDS } from "./options";
import { TransformGroup } from "./TransformGroup";

const styles = stylex.create({
  presets: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, marginBottom: 10 },
  label: { color: colors.muted, fontSize: 12 },
});

export function MediaInspector({ clip }: { clip: MediaClip }) {
  const kind = useEditor((s) => s.project.assets[clip.assetId]?.kind);
  const hasAudio = useEditor((s) => s.project.assets[clip.assetId]?.hasAudio ?? false);
  const commit = useEditor((s) => s.commit);
  if (!kind) return null;
  const setSpeed = (speed: number, coalesce?: string) =>
    commit((p) => setClipSpeed(p, clip.id, speed), { coalesce });
  return (
    <>
      {kind !== "audio" && <TransformGroup clip={clip} />}
      {hasAudio && (
        <Group title="Audio">
          <SliderRow
            label="Volume"
            value={clip.volume}
            min={0}
            max={2}
            {...PERCENT}
            onChange={(volume, k) => updateClip(clip.id, (c) => ({ ...c, volume }), k)}
          />
        </Group>
      )}
      {kind !== "image" && (
        <Group title="Speed">
          <div {...stylex.props(styles.presets)}>
            <span {...stylex.props(styles.label)}>Presets</span>
            <Segmented
              label="Speed presets"
              compact
              value={String(clip.speed)}
              options={SPEEDS.map((s) => ({ value: String(s), label: `${s}×` }))}
              onChange={(v) => setSpeed(Number(v))}
            />
          </div>
          <SliderRow
            label="Rate"
            value={clip.speed}
            min={0.1}
            max={8}
            precision={2}
            suffix="×"
            onChange={setSpeed}
          />
          <SpeedRampRow clip={clip} />
        </Group>
      )}
      {hasAudio && <AudioEffectsGroup clip={clip} />}
      {hasAudio && <SilenceGroup clip={clip} />}
      {hasAudio && <CaptionsGroup clipId={clip.id} />}
      {kind !== "audio" && <EffectsGroup clip={clip} />}
      <FadeGroup clip={clip} />
      {kind !== "audio" && <AnimationGroup clip={clip} />}
    </>
  );
}
