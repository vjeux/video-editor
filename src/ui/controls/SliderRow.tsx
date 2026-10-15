import { useGestureKey } from "../gesture";
import { NumberField } from "./NumberField";
import { Range } from "./Range";
import { Row } from "./Row";

/** Label + slider + number field; a drag, a scrub or a typed value is one undo step. */
export function SliderRow({
  label,
  ariaLabel = label,
  value,
  min,
  max,
  step,
  precision = 0,
  suffix,
  display = (v) => v,
  parse = (v) => v,
  defaultValue,
  onChange,
}: {
  label: string;
  /** Distinguishes repeated fields while keeping the visible label short. */
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  suffix?: string;
  /** Maps the stored value to the shown one (e.g. 0–1 → 0–100 %). */
  display?: (v: number) => number;
  parse?: (v: number) => number;
  /** Marked on the slider; double-click resets to it. */
  defaultValue?: number;
  onChange: (value: number, coalesce: string) => void;
}) {
  const gesture = useGestureKey(ariaLabel);
  return (
    <Row label={label}>
      <Range
        label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step ?? (max - min) / 200}
        onChange={(v) => onChange(v, gesture.key)}
        onCommitEnd={gesture.renew}
        defaultValue={defaultValue}
        valueText={`${display(value).toFixed(precision)}${suffix ?? ""}`}
      />
      <NumberField
        label={ariaLabel}
        value={display(value)}
        precision={precision}
        suffix={suffix}
        min={display(min)}
        max={display(max)}
        step={step ? display(step) - display(0) : 10 ** -precision}
        onChange={(v) => onChange(parse(v), gesture.key)}
        onCommitEnd={gesture.renew}
      />
    </Row>
  );
}
