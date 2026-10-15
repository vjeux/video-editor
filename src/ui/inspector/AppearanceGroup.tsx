import * as stylex from "@stylexjs/stylex";
import { updateClip } from "../../app/commands";
import {
  DEFAULT_MEDIA_APPEARANCE,
  DEFAULT_MEDIA_BACKGROUND,
  DEFAULT_MEDIA_BORDER,
  DEFAULT_MEDIA_SHADOW,
} from "../../core/factories";
import { mediaFrameSize } from "../../core/media-layout";
import type { MediaAppearance, MediaBlendMode, MediaClip } from "../../core/types";
import { useEditor } from "../../store";
import { ColorInput } from "../controls/ColorInput";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { SliderRow } from "../controls/SliderRow";
import { Toggle } from "../controls/Toggle";
import { colors } from "../theme/tokens.stylex";
import { AppearanceFold } from "./AppearanceFold";
import { AppearanceHint } from "./AppearanceHint";
import { InsetsFields } from "./InsetsFields";
import { FrameShadowControls } from "./FrameShadowControls";
import { CornerControls } from "./CornerControls";
import { BorderStylePicker } from "./BorderStylePicker";
import { Group } from "./Group";
import { MaskEditor } from "./MaskEditor";
import { PERCENT } from "./options";
import { StyleEffectRow } from "./StyleEffectRow";

const styles = stylex.create({
  reset: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 10,
    color: { default: colors.faint, ":hover": colors.text },
    cursor: "pointer",
  },
  swatches: { display: "flex", gap: 8 },
});
const SHAPES = [
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Oval" },
  { value: "diamond", label: "Diamond" },
  { value: "hexagon", label: "Hexagon" },
  { value: "custom", label: "Custom polygon" },
] as const;
const ASPECTS = [
  { value: "source", label: "Source" },
  { value: String(16 / 9), label: "16:9 · Landscape" },
  { value: String(9 / 16), label: "9:16 · Portrait" },
  { value: "1", label: "1:1 · Square" },
  { value: String(4 / 3), label: "4:3 · Classic" },
  { value: String(3 / 4), label: "3:4 · Portrait" },
];
const BLENDS: readonly { value: MediaBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "soft-light", label: "Soft light" },
  { value: "hard-light", label: "Hard light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
];

/** Shared frame geometry and styling for video and still-image clips. */
export function AppearanceGroup({ clip }: { clip: MediaClip }) {
  const settings = useEditor((s) => s.project.settings);
  const asset = useEditor((s) => s.project.assets[clip.assetId]);
  const a = clip.appearance;
  const size = mediaFrameSize(
    asset?.width || settings.width,
    asset?.height || settings.height,
    settings.width,
    settings.height,
    a,
  );
  const maxRadius = Math.floor(Math.min(size.width, size.height) / 2);
  const { radius, border, shadow, background, padding, crop, mask } = a;
  const set = (patch: Partial<MediaAppearance>, coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "media" ? { ...c, appearance: { ...c.appearance, ...patch } } : c),
      coalesce && `${clip.id}:${coalesce}`,
    );
  return (
    <Group
      title="Appearance"
      action={
        <button
          type="button"
          aria-label="Reset appearance"
          onClick={() => set(DEFAULT_MEDIA_APPEARANCE)}
          {...stylex.props(styles.reset)}
        >
          Reset
        </button>
      }
    >
      <Row label="Shape" wide>
        <Select
          label="Frame shape"
          value={mask.shape}
          options={SHAPES}
          onChange={(shape) => set({ mask: { ...mask, shape } })}
        />
      </Row>
      {mask.shape === "custom" && (
        <MaskEditor
          ratio={size.width / size.height}
          points={mask.points}
          onChange={(points, key) => set({ mask: { ...mask, points } }, key)}
        />
      )}
      {mask.shape === "rectangle" && (
        <CornerControls
          radius={radius}
          max={maxRadius}
          onChange={(radius, key) => set({ radius }, key)}
        />
      )}
      <SliderRow
        label="Feather"
        value={a.feather}
        min={0}
        max={Math.floor(maxRadius / 2)}
        step={1}
        suffix="px"
        defaultValue={0}
        onChange={(feather, key) => set({ feather }, key)}
      />
      <Row label="Blend" wide>
        <Select
          label="Blend mode"
          value={a.blendMode}
          options={BLENDS}
          onChange={(blendMode) => set({ blendMode })}
        />
      </Row>
      <AppearanceFold title="Crop & fit" summary={a.fit === "cover" ? "Fill frame" : "Fit inside"}>
        <Row label="Frame" wide>
          <Select
            label="Frame aspect ratio"
            value={mask.shape === "circle" ? "1" : a.aspect === null ? "source" : String(a.aspect)}
            options={
              a.aspect !== null && !ASPECTS.some((o) => Number(o.value) === a.aspect)
                ? [...ASPECTS, { value: String(a.aspect), label: "Custom ratio" }]
                : ASPECTS
            }
            disabled={mask.shape === "circle"}
            onChange={(v) => set({ aspect: v === "source" ? null : Number(v) })}
          />
        </Row>
        <Row label="Fit" wide>
          <Segmented
            label="Media fit"
            value={a.fit}
            options={[
              { value: "contain", label: "Contain" },
              { value: "cover", label: "Cover" },
            ]}
            onChange={(fit) => set({ fit })}
          />
        </Row>
        <SliderRow
          label="Position X"
          ariaLabel="Content position X"
          value={a.position.x}
          min={0}
          max={1}
          defaultValue={0.5}
          {...PERCENT}
          onChange={(x, key) => set({ position: { ...a.position, x } }, key)}
        />
        <SliderRow
          label="Position Y"
          ariaLabel="Content position Y"
          value={a.position.y}
          min={0}
          max={1}
          defaultValue={0.5}
          {...PERCENT}
          onChange={(y, key) => set({ position: { ...a.position, y } }, key)}
        />
        <AppearanceHint>
          Crop source edges before fitting. Position aligns the picture inside the frame.
        </AppearanceHint>
        <InsetsFields
          label="Crop"
          value={crop}
          max={{
            top: Math.max(0, 0.99 - crop.bottom),
            right: Math.max(0, 0.99 - crop.left),
            bottom: Math.max(0, 0.99 - crop.top),
            left: Math.max(0, 0.99 - crop.right),
          }}
          percent
          onChange={(crop, key) => set({ crop }, key)}
        />
      </AppearanceFold>
      <AppearanceFold
        title="Padding"
        summary={padding.linked ? `${padding.top} px` : "Individual sides"}
      >
        <Row label="Link sides" wide>
          <Toggle
            label="Link padding sides"
            on={padding.linked}
            onChange={(linked) =>
              set({
                padding: linked
                  ? {
                      top: padding.top,
                      right: padding.top,
                      bottom: padding.top,
                      left: padding.top,
                      linked,
                    }
                  : { ...padding, linked },
              })
            }
          />
        </Row>
        {padding.linked ? (
          <SliderRow
            label="Padding"
            value={padding.top}
            min={0}
            max={Math.max(0, maxRadius - 1)}
            step={1}
            suffix="px"
            defaultValue={0}
            onChange={(value, key) =>
              set(
                { padding: { top: value, right: value, bottom: value, left: value, linked: true } },
                key,
              )
            }
          />
        ) : (
          <InsetsFields
            label="Padding"
            value={padding}
            max={Math.max(size.width, size.height) - 1}
            onChange={(value, key) => set({ padding: { ...value, linked: false } }, key)}
          />
        )}
        <AppearanceHint>Space inside the frame. Add a background to fill it.</AppearanceHint>
      </AppearanceFold>
      <StyleEffectRow
        label="Background"
        on={background !== null}
        onToggle={(on) => set({ background: on ? DEFAULT_MEDIA_BACKGROUND : null })}
        inline={
          background && (
            <ColorInput
              label="Frame background colour"
              value={background.color}
              allowAlpha
              onChange={(color, key) => set({ background: { ...background, color } }, key)}
            />
          )
        }
      >
        {background && (
          <>
            <Row label="Fill" wide>
              <Segmented
                label="Background fill"
                value={background.type}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "linear", label: "Gradient" },
                ]}
                onChange={(type) => set({ background: { ...background, type } })}
              />
            </Row>
            {background.type === "linear" && (
              <>
                <Row label="Colours" wide>
                  <div {...stylex.props(styles.swatches)}>
                    <ColorInput
                      label="Background gradient start"
                      value={background.color}
                      allowAlpha
                      onChange={(color, key) => set({ background: { ...background, color } }, key)}
                    />
                    <ColorInput
                      label="Background gradient end"
                      value={background.color2}
                      allowAlpha
                      onChange={(color2, key) =>
                        set({ background: { ...background, color2 } }, key)
                      }
                    />
                  </div>
                </Row>
                <SliderRow
                  label="Angle"
                  ariaLabel="Background gradient angle"
                  value={background.angle}
                  min={0}
                  max={360}
                  step={1}
                  suffix="°"
                  onChange={(angle, key) => set({ background: { ...background, angle } }, key)}
                />
              </>
            )}
          </>
        )}
      </StyleEffectRow>
      <StyleEffectRow
        label="Border"
        on={border !== null}
        onToggle={(on) => set({ border: on ? DEFAULT_MEDIA_BORDER : null })}
      >
        {border && (
          <>
            <BorderStylePicker
              value={border.style}
              onChange={(style) => set({ border: { ...border, style } })}
            />
            <Row label="Colour" wide>
              <ColorInput
                label="Border colour"
                value={border.color}
                allowAlpha
                showValue
                onChange={(color, key) => set({ border: { ...border, color } }, key)}
              />
            </Row>
            <SliderRow
              label="Width"
              ariaLabel="Border width"
              value={border.width}
              min={0}
              max={Math.min(128, maxRadius)}
              step={1}
              suffix="px"
              onChange={(width, key) => set({ border: { ...border, width } }, key)}
            />
            {border.style === "gradient" && (
              <>
                <Row label="End colour" wide>
                  <ColorInput
                    label="Border gradient end"
                    value={border.color2}
                    allowAlpha
                    onChange={(color2, key) => set({ border: { ...border, color2 } }, key)}
                  />
                </Row>
                <SliderRow
                  label="Angle"
                  ariaLabel="Border gradient angle"
                  value={border.angle}
                  min={0}
                  max={360}
                  step={1}
                  suffix="°"
                  onChange={(angle, key) => set({ border: { ...border, angle } }, key)}
                />
              </>
            )}
          </>
        )}
      </StyleEffectRow>
      <FrameShadowControls
        label="Shadow"
        value={shadow}
        defaults={DEFAULT_MEDIA_SHADOW}
        onChange={(shadow, key) => set({ shadow }, key)}
      />
      <FrameShadowControls
        label="Inner shadow"
        value={a.innerShadow}
        defaults={{ ...DEFAULT_MEDIA_SHADOW, blur: 16, y: 8 }}
        onChange={(innerShadow, key) => set({ innerShadow }, key)}
      />
      <StyleEffectRow
        label="Glow"
        on={a.glow !== null}
        onToggle={(on) =>
          set({ glow: on ? { color: "rgba(139, 116, 255, 0.8)", blur: 32 } : null })
        }
        inline={
          a.glow && (
            <ColorInput
              label="Glow colour"
              value={a.glow.color}
              allowAlpha
              onChange={(color, key) => set({ glow: { ...a.glow!, color } }, key)}
            />
          )
        }
      >
        {a.glow && (
          <SliderRow
            label="Spread"
            ariaLabel="Glow spread"
            value={a.glow.blur}
            min={0}
            max={200}
            step={1}
            suffix="px"
            onChange={(blur, key) => set({ glow: { ...a.glow!, blur } }, key)}
          />
        )}
      </StyleEffectRow>
    </Group>
  );
}
