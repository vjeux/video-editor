import { updateClip } from "../../app/commands";
import { DEFAULT_TEXT_SHADOW } from "../../core/factories";
import type { TextClip, TextStyle } from "../../core/types";
import { ColorInput } from "../controls/ColorInput";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { SliderRow } from "../controls/SliderRow";
import { Group } from "./Group";
import { TEXT_LOOK_DEFAULTS } from "./options";
import { StyleEffectRow } from "./StyleEffectRow";

/** Shadow, neon glow, gradient fill, line/word highlight and shine for a title. */
export function TextEffectsGroup({ clip }: { clip: TextClip }) {
  const { style } = clip;
  const set = (patch: Partial<TextStyle>, coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "text" ? { ...c, style: { ...c.style, ...patch } } : c),
      coalesce && `${clip.id}:${coalesce}`,
    );
  const { shadow, glow, gradient, highlight, shine } = style;
  return (
    <Group title="Text effects">
      <StyleEffectRow
        label="Shadow"
        on={shadow !== null}
        onToggle={(on) => set({ shadow: on ? DEFAULT_TEXT_SHADOW : null })}
        inline={
          shadow && (
            <ColorInput
              label="Shadow colour"
              value={shadow.color}
              allowAlpha
              onChange={(color, key) => set({ shadow: { ...shadow, color } }, key)}
            />
          )
        }
      >
        {shadow && (
          <>
            <SliderRow
              label="Blur"
              value={shadow.blur}
              min={0}
              max={1}
              precision={2}
              onChange={(blur, k) => set({ shadow: { ...shadow, blur } }, k)}
            />
            <SliderRow
              label="Offset X"
              value={shadow.x}
              min={-0.5}
              max={0.5}
              precision={2}
              onChange={(x, k) => set({ shadow: { ...shadow, x } }, k)}
            />
            <SliderRow
              label="Offset Y"
              value={shadow.y}
              min={-0.5}
              max={0.5}
              precision={2}
              onChange={(y, k) => set({ shadow: { ...shadow, y } }, k)}
            />
          </>
        )}
      </StyleEffectRow>

      <StyleEffectRow
        label="Neon glow"
        on={glow !== null}
        onToggle={(on) => set({ glow: on ? TEXT_LOOK_DEFAULTS.glow : null })}
        inline={
          glow && (
            <ColorInput
              label="Glow colour"
              value={glow.color}
              allowAlpha
              onChange={(color, key) => set({ glow: { ...glow, color } }, key)}
            />
          )
        }
      >
        {glow && (
          <SliderRow
            label="Size"
            value={glow.size}
            min={0.05}
            max={1.2}
            precision={2}
            onChange={(size, k) => set({ glow: { ...glow, size } }, k)}
          />
        )}
      </StyleEffectRow>

      <StyleEffectRow
        label="Gradient fill"
        on={gradient !== null}
        onToggle={(on) => set({ gradient: on ? TEXT_LOOK_DEFAULTS.gradient : null })}
        inline={
          gradient && (
            <>
              <ColorInput
                label="Gradient start"
                value={gradient.from}
                allowAlpha
                onChange={(from, key) => set({ gradient: { ...gradient, from } }, key)}
              />
              <ColorInput
                label="Gradient end"
                value={gradient.to}
                allowAlpha
                onChange={(to, key) => set({ gradient: { ...gradient, to } }, key)}
              />
            </>
          )
        }
      >
        {gradient && (
          <SliderRow
            label="Angle"
            value={gradient.angle}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            onChange={(angle, k) => set({ gradient: { ...gradient, angle } }, k)}
          />
        )}
      </StyleEffectRow>

      <StyleEffectRow
        label="Highlight"
        on={highlight !== null}
        onToggle={(on) => set({ highlight: on ? TEXT_LOOK_DEFAULTS.highlight : null })}
        inline={
          highlight && (
            <ColorInput
              label="Highlight colour"
              value={highlight.color}
              allowAlpha
              onChange={(color, key) => set({ highlight: { ...highlight, color } }, key)}
            />
          )
        }
      >
        {highlight && (
          <>
            <Row label="Behind" wide>
              <Segmented
                label="Highlight each"
                value={highlight.mode}
                options={[
                  { value: "line", label: "Each line" },
                  { value: "word", label: "Each word" },
                ]}
                onChange={(mode) => set({ highlight: { ...highlight, mode } })}
              />
            </Row>
            <SliderRow
              label="Padding"
              value={highlight.padding}
              min={0}
              max={0.6}
              precision={2}
              onChange={(padding, k) => set({ highlight: { ...highlight, padding } }, k)}
            />
          </>
        )}
      </StyleEffectRow>

      <StyleEffectRow
        label="Shine"
        on={shine !== null}
        onToggle={(on) => set({ shine: on ? TEXT_LOOK_DEFAULTS.shine : null })}
      >
        {shine && (
          <SliderRow
            label="Every"
            value={shine.period}
            min={0.5}
            max={6}
            precision={1}
            suffix="s"
            onChange={(period, k) => set({ shine: { ...shine, period } }, k)}
          />
        )}
      </StyleEffectRow>
    </Group>
  );
}
