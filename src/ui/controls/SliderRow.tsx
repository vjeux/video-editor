import { useGestureKey } from "../gesture";
import { NumberField } from "./NumberField";
import { Range } from "./Range";
import { Row } from "./Row";

/** Label + slider + number field; a drag or a typed value is one undo step. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  precision = 0,
  suffix,
  display = (v) => v,
  parse = (v) => v,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  suffix?: string;
  /** Maps the stored value to the shown one (e.g. 0–1 → 0–100 %). */
  display?: (v: number) => number;
  parse?: (v: number) => number;
  onChange: (value: number, coalesce: string) => void;
}) {
  const gesture = useGestureKey(label);
  return (
    <Row label={label}>
      <Range
        label={label}
        value={value}
        min={min}
        max={max}
        step={step ?? (max - min) / 200}
        onChange={(v) => onChange(v, gesture.key)}
        onCommitEnd={gesture.renew}
      />
      <NumberField
        label={label}
        value={display(value)}
        precision={precision}
        suffix={suffix}
        min={display(min)}
        max={display(max)}
        step={step ? display(step) - display(0) : 1}
        onChange={(v) => {
          onChange(parse(v), `${gesture.key}:typed`);
          gesture.renew();
        }}
      />
    </Row>
  );
}
