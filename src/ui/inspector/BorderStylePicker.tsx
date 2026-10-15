import { useId } from "react";
import type { FrameBorder } from "../../core/types";
import { AppearancePresets } from "./AppearancePresets";
const OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dash" },
  { value: "dotted", label: "Dot" },
  { value: "double", label: "Double" },
  { value: "gradient", label: "Gradient" },
] as const;
export function BorderStylePicker({
  value,
  onChange,
}: {
  value: FrameBorder["style"];
  onChange: (value: FrameBorder["style"]) => void;
}) {
  const id = useId();
  return (
    <AppearancePresets
      label="Border style"
      value={value}
      options={OPTIONS.map((o) => ({
        ...o,
        preview: (
          <svg width="28" height="16" viewBox="0 0 28 16">
            <defs>
              <linearGradient id={`${id}-${o.value}`}>
                <stop stopColor="currentColor" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect
              x="2"
              y="2"
              width="24"
              height="12"
              rx="3"
              fill="none"
              stroke={o.value === "gradient" ? `url(#${id}-${o.value})` : "currentColor"}
              strokeWidth={o.value === "double" ? 1 : 2}
              strokeDasharray={
                o.value === "dashed" ? "5 3" : o.value === "dotted" ? "0 4" : undefined
              }
              strokeLinecap="round"
            />
            {o.value === "double" && (
              <rect x="5" y="5" width="18" height="6" rx="1" fill="none" stroke="currentColor" />
            )}
          </svg>
        ),
      }))}
      onChange={onChange}
    />
  );
}
