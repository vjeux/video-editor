import * as stylex from "@stylexjs/stylex";
import type { FrameInsets } from "../../core/types";
import { Field } from "../controls/Field";
import { NumberField } from "../controls/NumberField";
import { useGestureKey } from "../gesture";
const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 8,
    marginBottom: 10,
  },
});
export function InsetsFields({
  label,
  value,
  max,
  percent = false,
  onChange,
}: {
  label: string;
  value: FrameInsets;
  max: number | FrameInsets;
  percent?: boolean;
  onChange: (value: FrameInsets, key: string) => void;
}) {
  const gesture = useGestureKey(label);
  const factor = percent ? 100 : 1;
  return (
    <div {...stylex.props(styles.grid)}>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Field key={side} prefix={side[0]!.toUpperCase()}>
          <NumberField
            bare
            label={`${label} ${side}`}
            value={value[side] * factor}
            min={0}
            max={(typeof max === "number" ? max : max[side]) * factor}
            suffix={percent ? "%" : "px"}
            precision={percent ? 1 : 0}
            onChange={(n) => onChange({ ...value, [side]: n / factor }, gesture.key)}
            onCommitEnd={gesture.renew}
          />
        </Field>
      ))}
    </div>
  );
}
