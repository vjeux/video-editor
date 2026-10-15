import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Button } from "react-aria-components/Button";
import { ColorArea } from "react-aria-components/ColorArea";
import { ColorField } from "react-aria-components/ColorField";
import { ColorPicker, type Color } from "react-aria-components/ColorPicker";
import { ColorSlider } from "react-aria-components/ColorSlider";
import { ColorSwatch } from "react-aria-components/ColorSwatch";
import { Dialog, DialogTrigger } from "react-aria-components/Dialog";
import { Input } from "react-aria-components/Input";
import { Label } from "react-aria-components/Label";
import { Popover } from "react-aria-components/Popover";
import { SliderOutput, SliderTrack } from "react-aria-components/Slider";
import { useGestureKey } from "../gesture";
import { colors, fonts, radii, shadows } from "../theme/tokens.stylex";
import { colorValue, pickerColor } from "./color-value";
import { ColorPickerThumb } from "./ColorPickerThumb";
import { Icon } from "./Icon";
import { surfaces } from "./surfaces";

const styles = stylex.create({
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 30,
    height: 24,
    padding: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line2, ":hover": colors.muted },
    backgroundColor: "transparent",
    cursor: "pointer",
    overflow: "hidden",
  },
  swatch: { width: "100%", height: "100%", borderRadius: "inherit", flexShrink: 0 },
  compact: { width: 18, height: 18, borderRadius: 4 },
  spectrum: {
    backgroundImage: "conic-gradient(#ff8c9e, #ffd585, #8ee3b3, #8dc8ff, #ad9aff, #ff8c9e)",
  },
  row: { width: "100%", justifyContent: "flex-start", gap: 8, paddingInline: 4 },
  rowSwatch: { width: 22, height: 20, borderRadius: 4 },
  hex: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, textTransform: "uppercase" },
  popover: {
    width: 244,
    maxWidth: "calc(100vw - 24px)",
    overflowY: "auto",
    overscrollBehavior: "contain",
    zIndex: 120,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    backgroundColor: colors.panel,
    boxShadow: shadows.popover,
  },
  dialog: { display: "flex", flexDirection: "column", gap: 14, outline: "none" },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 12, fontWeight: 600, color: colors.text },
  close: {
    display: "grid",
    placeItems: "center",
    width: 24,
    height: 24,
    padding: 0,
    margin: -4,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: { default: "transparent", ":hover": colors.raised },
    color: { default: colors.muted, ":hover": colors.text },
    cursor: "pointer",
  },
  area: {
    width: "100%",
    height: { default: 206, "@media (max-width: 600px), (max-height: 760px)": 160 },
    borderRadius: 6,
    touchAction: "none",
  },
  slider: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8 },
  label: { fontSize: 11, color: colors.muted },
  output: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.muted },
  track: {
    height: 16,
    borderRadius: 5,
    gridColumnEnd: "-1",
    gridColumnStart: "1",
    touchAction: "none",
  },
  transparency: {
    gridColumnStart: "1",
    gridColumnEnd: "-1",
    borderRadius: 5,
    backgroundImage: "conic-gradient(#747982 25%, #444851 0 50%, #747982 0 75%, #444851 0)",
    backgroundSize: "8px 8px",
  },
  fields: { display: "flex", alignItems: "flex-end", gap: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6, flex: "1", minWidth: 0 },
  alphaField: { flexGrow: 0, flexBasis: 58 },
  input: { width: "100%", paddingInline: 8, fontFamily: fonts.mono, fontSize: 11.5 },
});

/** A shared, keyboard-accessible colour picker for the inspector and effects. */
export function ColorInput({
  label,
  value,
  onChange,
  showValue = false,
  compact = false,
  spectrum = false,
  allowAlpha = false,
}: {
  label: string;
  value: string;
  onChange: (value: string, coalesce?: string) => void;
  showValue?: boolean;
  compact?: boolean;
  spectrum?: boolean;
  allowAlpha?: boolean;
}) {
  // Keep the HSB object while editing: hex alone loses the chosen hue on white/black.
  const [draft, setDraft] = useState<{ value: string; color: Color } | null>(null);
  const color = draft?.value === value ? draft.color : pickerColor(value);
  const gesture = useGestureKey("color");
  const change = (next: Color) => {
    const serialized = colorValue(next, allowAlpha);
    setDraft({ value: serialized, color: next });
    if (serialized !== value) onChange(serialized, gesture.key);
  };

  return (
    <ColorPicker value={color} onChange={change}>
      <DialogTrigger onOpenChange={() => gesture.renew()}>
        <Button
          aria-label={label}
          aria-description={color.toString("hex")}
          onKeyDown={(e) => e.stopPropagation()}
          {...stylex.props(
            styles.trigger,
            compact && styles.compact,
            spectrum && styles.spectrum,
            showValue && surfaces.well,
            showValue && styles.row,
          )}
        >
          {!spectrum && (
            <ColorSwatch {...stylex.props(styles.swatch, showValue && styles.rowSwatch)} />
          )}
          {showValue && <span {...stylex.props(styles.hex)}>{color.toString("hex")}</span>}
        </Button>
        <Popover
          placement="bottom end"
          offset={8}
          data-popover=""
          {...stylex.props(styles.popover)}
        >
          <Dialog aria-label={label} aria-modal="true" {...stylex.props(styles.dialog)}>
            {({ close }) => (
              <>
                <div {...stylex.props(styles.heading)}>
                  <span {...stylex.props(styles.title)}>{label}</span>
                  <Button
                    aria-label="Close color picker"
                    onPress={close}
                    {...stylex.props(styles.close)}
                  >
                    <Icon name="close" size={14} />
                  </Button>
                </div>
                <ColorArea
                  aria-label="Color"
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                  onChangeEnd={gesture.renew}
                  {...stylex.props(styles.area)}
                >
                  <ColorPickerThumb />
                </ColorArea>
                <ColorSlider
                  colorSpace="hsb"
                  channel="hue"
                  onChangeEnd={gesture.renew}
                  {...stylex.props(styles.slider)}
                >
                  <Label {...stylex.props(styles.label)}>Hue</Label>
                  <SliderOutput {...stylex.props(styles.output)} />
                  <SliderTrack {...stylex.props(styles.track)}>
                    <ColorPickerThumb slider />
                  </SliderTrack>
                </ColorSlider>
                {allowAlpha && (
                  <ColorSlider
                    channel="alpha"
                    onChangeEnd={gesture.renew}
                    {...stylex.props(styles.slider)}
                  >
                    <Label {...stylex.props(styles.label)}>Opacity</Label>
                    <SliderOutput {...stylex.props(styles.output)} />
                    <div {...stylex.props(styles.transparency)}>
                      <SliderTrack {...stylex.props(styles.track)}>
                        <ColorPickerThumb slider />
                      </SliderTrack>
                    </div>
                  </ColorSlider>
                )}
                <div {...stylex.props(styles.fields)}>
                  <ColorField
                    value={color}
                    onChange={(next) => {
                      // Hex edits change RGB without discarding a translucent shadow or fill.
                      if (next)
                        change(next.withChannelValue("alpha", color.getChannelValue("alpha")));
                    }}
                    onBlur={gesture.renew}
                    {...stylex.props(styles.field)}
                  >
                    <Label {...stylex.props(styles.label)}>Hex</Label>
                    <Input {...stylex.props(surfaces.well, styles.input)} />
                  </ColorField>
                  {allowAlpha && (
                    <ColorField
                      channel="alpha"
                      onBlur={gesture.renew}
                      {...stylex.props(styles.field, styles.alphaField)}
                    >
                      <Label {...stylex.props(styles.label)}>Opacity</Label>
                      <Input {...stylex.props(surfaces.well, styles.input)} />
                    </ColorField>
                  )}
                </div>
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </ColorPicker>
  );
}
