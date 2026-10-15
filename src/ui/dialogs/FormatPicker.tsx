import { use } from "react";
import { EXPORT_FORMATS, encodableFormats, type ExportFormat } from "../../engine/export";
import { Segmented } from "../controls/Segmented";

const FORMATS = Object.keys(EXPORT_FORMATS) as ExportFormat[];

/** Suspends until the browser's encoders are probed; unsupported formats are disabled. */
export function FormatPicker({
  value,
  onChange,
}: {
  value: ExportFormat;
  onChange: (f: ExportFormat) => void;
}) {
  const supported = use(encodableFormats());
  return (
    <Segmented
      label="Format"
      value={value}
      options={FORMATS.map((f) => ({
        value: f,
        label: EXPORT_FORMATS[f].label,
        disabled: !supported[f],
        title: supported[f] ? undefined : "Not supported by this browser's encoders",
      }))}
      onChange={onChange}
    />
  );
}
