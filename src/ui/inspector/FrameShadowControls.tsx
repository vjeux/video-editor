import { colorValue, pickerColor } from "../controls/color-value";
import { PERCENT } from "./options";
import type { FrameShadow } from "../../core/types";
import { ColorInput } from "../controls/ColorInput";
import { SliderRow } from "../controls/SliderRow";
import { ShadowOffsetControl } from "./ShadowOffsetControl";
import { Row } from "../controls/Row";
import { StyleEffectRow } from "./StyleEffectRow";
export function FrameShadowControls({
  label,
  value,
  defaults,
  onChange,
}: {
  label: string;
  value: FrameShadow | null;
  defaults: FrameShadow;
  onChange: (value: FrameShadow | null, key?: string) => void;
}) {
  return (
    <StyleEffectRow
      label={label}
      on={value !== null}
      onToggle={(on) => onChange(on ? defaults : null)}
    >
      {value && (
        <>
          <ShadowOffsetControl
            label={label}
            value={value}
            inner={label === "Inner shadow"}
            onChange={onChange}
          />
          <Row label="Colour" wide>
            <ColorInput
              label={`${label} colour`}
              value={value.color}
              allowAlpha
              showValue
              onChange={(color, key) => onChange({ ...value, color }, key)}
            />
          </Row>
          <SliderRow
            label="Opacity"
            ariaLabel={`${label} opacity`}
            value={pickerColor(value.color).getChannelValue("alpha")}
            min={0}
            max={1}
            {...PERCENT}
            onChange={(alpha, key) =>
              onChange(
                {
                  ...value,
                  color: colorValue(
                    pickerColor(value.color).withChannelValue("alpha", alpha),
                    true,
                  ),
                },
                key,
              )
            }
          />
          <SliderRow
            label="Softness"
            ariaLabel={`${label} blur`}
            value={value.blur}
            min={0}
            max={200}
            step={1}
            suffix="px"
            onChange={(blur, key) => onChange({ ...value, blur }, key)}
          />
        </>
      )}
    </StyleEffectRow>
  );
}
