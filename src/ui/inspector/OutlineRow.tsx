import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import type { TextClip } from "../../core/types";
import { NumberField } from "../controls/NumberField";
import { Row } from "../controls/Row";
import { Toggle } from "../controls/Toggle";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  controls: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  color: {
    width: 28,
    height: 22,
    padding: 0,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
    cursor: "pointer",
  },
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
            <input
              type="color"
              aria-label="Outline colour"
              value={stroke.color}
              onChange={(e) => set({ ...stroke, color: e.target.value }, `stroke-color:${clip.id}`)}
              {...stylex.props(styles.color)}
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
