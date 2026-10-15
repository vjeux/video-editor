import * as stylex from "@stylexjs/stylex";
import type { ParamDef, ParamValue } from "../../core/types";
import { ColorInput } from "./ColorInput";
import { Field } from "./Field";
import { NumberField } from "./NumberField";
import { Row } from "./Row";
import { SliderRow } from "./SliderRow";
import { Toggle } from "./Toggle";

const styles = stylex.create({
  pair: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 6 },
});

const precisionFor = (def: ParamDef) => {
  if (def.type === "int") return 0;
  const span = (def.max ?? 1) - (def.min ?? 0);
  return span >= 100 ? 0 : span >= 10 ? 1 : 2;
};

/**
 * Renders the right control for a shader parameter. `coalesce` groups a
 * continuous gesture (a slider drag) into one undo step.
 */
export function ParamControl({
  def,
  value,
  onChange,
}: {
  def: ParamDef;
  value: ParamValue | undefined;
  onChange: (value: ParamValue, coalesce?: string) => void;
}) {
  const current = value ?? def.default;
  if (def.type === "bool") {
    return (
      <Row label={def.label} wide>
        <Toggle label={def.label} on={current === true} onChange={(on) => onChange(on)} />
      </Row>
    );
  }
  if (def.type === "color") {
    return (
      <Row label={def.label} wide>
        <ColorInput
          showValue
          label={def.label}
          value={typeof current === "string" ? current : "#000000"}
          onChange={onChange}
        />
      </Row>
    );
  }
  if (def.type === "vec2") {
    const [x, y] = Array.isArray(current) ? (current as readonly [number, number]) : [0, 0];
    return (
      <Row label={def.label} wide>
        <div {...stylex.props(styles.pair)}>
          <Field prefix="X">
            <NumberField
              bare
              label={`${def.label} X`}
              value={x}
              step={0.1}
              precision={2}
              onChange={(v) => onChange([v, y])}
            />
          </Field>
          <Field prefix="Y">
            <NumberField
              bare
              label={`${def.label} Y`}
              value={y}
              step={0.1}
              precision={2}
              onChange={(v) => onChange([x, v])}
            />
          </Field>
        </div>
      </Row>
    );
  }
  const min = def.min ?? 0;
  const max = def.max ?? Math.max(1, typeof current === "number" ? current * 2 : 1);
  return (
    <SliderRow
      label={def.label}
      value={typeof current === "number" ? current : 0}
      min={min}
      max={max}
      step={def.step ?? (def.type === "int" ? 1 : undefined)}
      precision={precisionFor(def)}
      defaultValue={typeof def.default === "number" ? def.default : undefined}
      onChange={(v, coalesce) => onChange(def.type === "int" ? Math.round(v) : v, coalesce)}
    />
  );
}
