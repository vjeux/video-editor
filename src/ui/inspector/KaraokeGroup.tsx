import { updateClip } from "../../app/commands";
import type { Karaoke, TextClip } from "../../core/types";
import { ColorInput } from "../controls/ColorInput";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { Group } from "./Group";
import { StyleEffectRow } from "./StyleEffectRow";

const MODES = [
  { value: "fill", label: "Colour" },
  { value: "pop", label: "Pop" },
  { value: "box", label: "Box" },
] as const;

const DEFAULT_KARAOKE: Karaoke = { color: "#ffd400", mode: "pop" };

/** Words light up in turn across the clip, like spoken captions. */
export function KaraokeGroup({ clip }: { clip: TextClip }) {
  const karaoke = clip.karaoke;
  const set = (next: Karaoke | null, coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "text" ? { ...c, karaoke: next } : c),
      coalesce && `${clip.id}:${coalesce}`,
    );
  return (
    <Group title="Karaoke">
      <StyleEffectRow
        label="Highlight spoken words"
        on={karaoke !== null}
        onToggle={(on) => set(on ? DEFAULT_KARAOKE : null)}
        inline={
          karaoke && (
            <ColorInput
              label="Karaoke colour"
              value={karaoke.color}
              allowAlpha
              onChange={(color, key) => set({ ...karaoke, color }, key)}
            />
          )
        }
      >
        {karaoke && (
          <Row label="Style" wide>
            <Segmented
              label="Karaoke style"
              value={karaoke.mode}
              options={MODES}
              onChange={(mode) => set({ ...karaoke, mode })}
            />
          </Row>
        )}
      </StyleEffectRow>
    </Group>
  );
}
