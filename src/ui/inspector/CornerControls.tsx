import { AppearancePresets } from "./AppearancePresets";
import { SliderRow } from "../controls/SliderRow";

export function CornerControls({
  radius,
  max,
  onChange,
}: {
  radius: number;
  max: number;
  onChange: (radius: number, key?: string) => void;
}) {
  const options = [
    { value: "square", label: "Square", radius: 0, previewRadius: 0 },
    { value: "soft", label: "Soft", radius: Math.min(24, max), previewRadius: 3 },
    { value: "round", label: "Round", radius: Math.min(64, max), previewRadius: 7 },
    { value: "pill", label: "Pill", radius: max, previewRadius: 10 },
  ];
  return (
    <>
      <AppearancePresets
        label="Corner presets"
        value={options.find((o) => o.radius === radius)?.value ?? ""}
        options={options.map((o) => ({
          ...o,
          preview: (
            <svg width="30" height="20" viewBox="0 0 30 20">
              <rect
                x="1"
                y="1"
                width="28"
                height="18"
                rx={o.previewRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          ),
        }))}
        onChange={(value) => onChange(options.find((o) => o.value === value)!.radius)}
      />
      <SliderRow
        label="Radius"
        value={radius}
        min={0}
        max={max}
        step={1}
        suffix="px"
        defaultValue={0}
        onChange={onChange}
      />
    </>
  );
}
