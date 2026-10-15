import * as stylex from "@stylexjs/stylex";
import { applyAudioEffect } from "../../app/audio-effects";
import type { MediaClip } from "../../core/types";
import { Select } from "../controls/Select";
import { colors } from "../theme/tokens.stylex";
import { AudioEffectItem } from "./AudioEffectItem";
import { AUDIO_EFFECT_GROUPS } from "./options";
import { Group } from "./Group";

const styles = stylex.create({
  list: { margin: 0, padding: 0, marginBottom: 8 },
  hint: { margin: 0, marginBottom: 8, color: colors.faint, fontSize: 11.5, lineHeight: 1.5 },
});

/** The clip's audio effect chain (voice fixes, space, character), applied in order. */
export function AudioEffectsGroup({ clip }: { clip: MediaClip }) {
  const stack = clip.audioEffects;
  return (
    <Group title="Audio effects">
      {stack.length === 0 ? (
        <p {...stylex.props(styles.hint)}>
          Clean up a voice or add character — reverb, echo, telephone, pitch…
        </p>
      ) : (
        <ul {...stylex.props(styles.list)}>
          {stack.map((instance, index) => (
            <AudioEffectItem
              key={instance.id}
              clipId={clip.id}
              instance={instance}
              index={index}
              count={stack.length}
            />
          ))}
        </ul>
      )}
      <Select
        label="Add audio effect"
        value=""
        onChange={(id) => id && applyAudioEffect(id, [clip.id])}
      >
        <option value="" disabled>
          Add audio effect…
        </option>
        {AUDIO_EFFECT_GROUPS.map((group) => (
          <optgroup key={group.category} label={group.category}>
            {group.effects.map((effect) => (
              <option key={effect.id} value={effect.id} title={effect.description}>
                {effect.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </Group>
  );
}
