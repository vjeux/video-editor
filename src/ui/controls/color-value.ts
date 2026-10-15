import { parseColor, type Color } from "react-aria-components/ColorPicker";

/** Accept saved CSS colours, including translucent shadows and short hex values. */
export function pickerColor(value: string): Color {
  try {
    return parseColor(value);
  } catch {
    return parseColor("#000000");
  }
}

/** Shader colours remain six-digit hex; canvas styles can retain transparency. */
export function colorValue(color: Color, allowAlpha: boolean): string {
  return allowAlpha && color.getChannelValue("alpha") < 1
    ? color.toString("rgba")
    : color.toString("hex").toLowerCase();
}
