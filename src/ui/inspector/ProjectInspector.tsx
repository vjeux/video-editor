import * as stylex from "@stylexjs/stylex";
import type { ProjectSettings } from "../../core/types";
import { useEditor } from "../../store";
import { Field } from "../controls/Field";
import { NumberField } from "../controls/NumberField";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { FORMAT_PRESETS } from "../formats";
import { ColorSwatches } from "./ColorSwatches";
import { Group } from "./Group";
import { BACKGROUNDS, FRAME_RATES } from "./options";
import { ShortcutList } from "./ShortcutList";

const styles = stylex.create({
  pair: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 6 },
});

const even = (n: number) => Math.round(n / 2) * 2;

export function ProjectInspector() {
  const settings = useEditor((s) => s.project.settings);
  const commit = useEditor((s) => s.commit);
  const setSettings = (patch: Partial<ProjectSettings>, coalesce?: string) =>
    commit((p) => ({ ...p, settings: { ...p.settings, ...patch } }), { coalesce });
  return (
    <>
      <Group title="Project">
        <Row label="Canvas" wide>
          <div {...stylex.props(styles.pair)}>
            <Field prefix="W">
              <NumberField
                bare
                label="Width"
                value={settings.width}
                min={16}
                max={7680}
                step={2}
                onChange={(width) => setSettings({ width: even(width) })}
              />
            </Field>
            <Field prefix="H">
              <NumberField
                bare
                label="Height"
                value={settings.height}
                min={16}
                max={7680}
                step={2}
                onChange={(height) => setSettings({ height: even(height) })}
              />
            </Field>
          </div>
        </Row>
        <Row label="Presets" wide>
          <Select
            label="Format preset"
            value=""
            onChange={(label) => {
              const preset = FORMAT_PRESETS.find((p) => p.label === label);
              if (preset) setSettings({ width: preset.width, height: preset.height });
            }}
          >
            <option value="" disabled>
              Choose a format…
            </option>
            {FORMAT_PRESETS.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
          </Select>
        </Row>
        <Row label="Frame rate" wide>
          <Segmented
            label="Frame rate"
            value={String(settings.fps)}
            options={FRAME_RATES.map((f) => ({ value: String(f), label: f }))}
            onChange={(fps) => setSettings({ fps: Number(fps) })}
          />
        </Row>
        <Row label="Background" wide>
          <ColorSwatches
            value={settings.background}
            palette={BACKGROUNDS}
            onChange={(background) => setSettings({ background }, "bg")}
          />
        </Row>
      </Group>
      <Group title="Shortcuts">
        <ShortcutList />
      </Group>
    </>
  );
}
