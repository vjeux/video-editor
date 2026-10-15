import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { updateClip } from "../../app/commands";
import type { TextAlign, TextClip, TextStyle } from "../../core/types";
import { Icon } from "../controls/Icon";
import { Row } from "../controls/Row";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { SliderRow } from "../controls/SliderRow";
import { TextArea } from "../controls/TextArea";
import { Toggle } from "../controls/Toggle";
import { AnimationGroup } from "./AnimationGroup";
import { AnimationPresets } from "./AnimationPresets";
import { ColorSwatches } from "./ColorSwatches";
import { EffectsGroup } from "./EffectsGroup";
import { FadeGroup } from "./FadeGroup";
import { CaptionPresets } from "./CaptionPresets";
import { Group } from "./Group";
import { KaraokeGroup } from "./KaraokeGroup";
import { TextEffectsGroup } from "./TextEffectsGroup";
import { WordAnimationGroup } from "./WordAnimationGroup";
import { OutlineRow } from "./OutlineRow";
import { BOX_BACKGROUND, COLORS, FONTS, WEIGHTS } from "./options";
import { TransformGroup } from "./TransformGroup";

const styles = stylex.create({
  pair: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
  },
});

const ALIGNS: readonly { value: TextAlign; label: ReactNode; title: string }[] = [
  { value: "left", label: <Icon name="alignLeft" size={13} />, title: "Left" },
  { value: "center", label: <Icon name="alignCenter" size={13} />, title: "Center" },
  { value: "right", label: <Icon name="alignRight" size={13} />, title: "Right" },
];

export function TextInspector({ clip }: { clip: TextClip }) {
  const setStyle = (patch: Partial<TextStyle>, coalesce?: string) =>
    updateClip(
      clip.id,
      (c) => (c.type === "text" ? { ...c, style: { ...c.style, ...patch } } : c),
      coalesce,
    );
  const { style } = clip;
  return (
    <>
      <Group title="Text">
        <TextArea
          label="Text"
          rows={Math.min(5, clip.text.split("\n").length + 1)}
          value={clip.text}
          onChange={(text) =>
            updateClip(clip.id, (c) => (c.type === "text" ? { ...c, text } : c), `text:${clip.id}`)
          }
        />
        <div {...stylex.props(styles.pair)}>
          <Select
            label="Font"
            value={style.fontFamily}
            options={FONTS.map((f) => ({ value: f.family, label: f.label, font: f.family }))}
            onChange={(fontFamily) => setStyle({ fontFamily })}
          />
          <Select
            label="Weight"
            value={String(style.fontWeight)}
            options={WEIGHTS.map((w) => ({ value: String(w.value), label: w.label }))}
            onChange={(v) => setStyle({ fontWeight: Number(v) })}
          />
        </div>
        <SliderRow
          label="Size"
          value={style.fontSize}
          min={12}
          max={400}
          step={1}
          onChange={(fontSize, k) => setStyle({ fontSize }, k)}
        />
        <SliderRow
          label="Tracking"
          value={style.letterSpacing}
          min={-10}
          max={40}
          step={0.5}
          precision={1}
          onChange={(letterSpacing, k) => setStyle({ letterSpacing }, k)}
        />
        <Row label="Color" wide>
          <ColorSwatches
            value={style.color}
            palette={COLORS}
            allowAlpha
            onChange={(color, key) => setStyle({ color }, key)}
          />
        </Row>
        <Row label="Align" wide>
          <Segmented
            label="Text align"
            value={style.align}
            options={ALIGNS}
            onChange={(align) => setStyle({ align })}
          />
        </Row>
        <Row label="Box" wide>
          <Toggle
            label="Background box"
            on={style.background !== null}
            onChange={(on) => setStyle({ background: on ? BOX_BACKGROUND : null })}
          />
        </Row>
        <OutlineRow clip={clip} />
      </Group>
      <Group title="Caption style">
        <CaptionPresets clip={clip} />
      </Group>
      <TextEffectsGroup clip={clip} />
      <WordAnimationGroup clip={clip} />
      <KaraokeGroup clip={clip} />
      <Group title="Text animation">
        <AnimationPresets clip={clip} />
      </Group>
      <TransformGroup clip={clip} />
      <EffectsGroup clip={clip} />
      <FadeGroup clip={clip} />
      <AnimationGroup clip={clip} />
    </>
  );
}
