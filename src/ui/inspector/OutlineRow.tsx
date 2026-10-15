import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import type { TextClip } from "../../core/types";
import { ColorInput } from "../controls/ColorInput";
import { NumberField } from "../controls/NumberField";
import { Row } from "../controls/Row";
import { Toggle } from "../controls/Toggle";

const styles = stylex.create({
  controls: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  width: { width: 56 },
});

const DEFAULT_STROKE = { color: "#000000", width: 8 };

/** Glyph outline for caption looks: on/off, colour and width. */
export function OutlineRow({ clip }: { clip: TextClip }) {
  const stroke = clip.style.stroke;
  const set = (next: TextClip["style"]["stroke"], coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "text" ? { ...c, style: { ...c.style, stroke: next } } : c),
      coalesce,
    );
  return (
    <Row label="Outline" wide>
      <div {...stylex.props(styles.controls)}>
        <Toggle
          label="Outline"
          on={stroke !== null}
          onChange={(on) => set(on ? DEFAULT_STROKE : null)}
        />
        {stroke && (
          <>
            <ColorInput
              label="Outline colour"
              value={stroke.color}
              allowAlpha
              onChange={(color, key) => set({ ...stroke, color }, key)}
            />
            <div {...stylex.props(styles.width)}>
              <NumberField
                label="Outline width"
                value={stroke.width}
                min={1}
                max={40}
                onChange={(width) => set({ ...stroke, width })}
              />
            </div>
          </>
        )}
      </div>
    </Row>
  );
}
