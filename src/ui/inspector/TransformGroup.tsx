import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import { DEFAULT_TRANSFORM } from "../../core/factories";
import type { Clip, Transform } from "../../core/types";
import { Field } from "../controls/Field";
import { NumberField } from "../controls/NumberField";
import { Row } from "../controls/Row";
import { SliderRow } from "../controls/SliderRow";
import { colors } from "../theme/tokens.stylex";
import { Group } from "./Group";
import { PERCENT } from "./options";

const styles = stylex.create({
  pair: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 6 },
  reset: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 10,
    textTransform: "none",
    letterSpacing: 0,
    color: { default: colors.faint, ":hover": colors.text },
    cursor: "pointer",
  },
});

export function TransformGroup({ clip }: { clip: Clip }) {
  const set = (patch: Partial<Transform>, coalesce?: string) =>
    updateClip(clip.id, (c) => ({ ...c, transform: { ...c.transform, ...patch } }), coalesce);
  const t = clip.transform;
  return (
    <Group
      title="Transform"
      action={
        <button
          type="button"
          onClick={() => set(DEFAULT_TRANSFORM)}
          {...stylex.props(styles.reset)}
        >
          Reset
        </button>
      }
    >
      <Row label="Position" wide>
        <div {...stylex.props(styles.pair)}>
          <Field prefix="X">
            <NumberField bare label="Position X" value={t.x} onChange={(x) => set({ x })} />
          </Field>
          <Field prefix="Y">
            <NumberField bare label="Position Y" value={t.y} onChange={(y) => set({ y })} />
          </Field>
        </div>
      </Row>
      <SliderRow
        label="Scale"
        value={t.scale}
        min={0.05}
        max={4}
        {...PERCENT}
        onChange={(scale, k) => set({ scale }, k)}
      />
      <SliderRow
        label="Rotation"
        value={t.rotation}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        onChange={(rotation, k) => set({ rotation }, k)}
      />
      <SliderRow
        label="Opacity"
        value={t.opacity}
        min={0}
        max={1}
        {...PERCENT}
        onChange={(opacity, k) => set({ opacity }, k)}
      />
    </Group>
  );
}
