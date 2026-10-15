import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import type { FrameShadow } from "../../core/types";
import { Field } from "../controls/Field";
import { NumberField } from "../controls/NumberField";
import { useGestureKey } from "../gesture";
import { colors } from "../theme/tokens.stylex";

const LIMIT = 300;
const styles = stylex.create({
  layout: {
    display: "grid",
    gridTemplateColumns: "104px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  pad: {
    position: "relative",
    width: 104,
    height: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    backgroundColor: colors.field,
    overflow: "hidden",
    padding: 0,
    cursor: "crosshair",
    touchAction: "none",
  },
  axisX: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: colors.line,
  },
  axisY: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: colors.line,
  },
  frame: {
    position: "absolute",
    left: 32,
    top: 32,
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.muted,
    pointerEvents: "none",
  },
  shadow: (x: number, y: number, blur: number, color: string) => ({
    boxShadow: `${x}px ${y}px ${blur}px ${color}`,
  }),
  inner: (x: number, y: number, blur: number, color: string) => ({
    boxShadow: `inset ${x}px ${y}px ${blur}px ${color}`,
  }),
  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.panel,
    backgroundColor: colors.accent,
    boxShadow: "0 0 0 1px currentColor",
    color: colors.accent,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  position: (x: number, y: number) => ({
    left: `${50 + (x / LIMIT) * 40}%`,
    top: `${50 + (y / LIMIT) * 40}%`,
  }),
  fields: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  hint: { fontSize: 10, lineHeight: 1.4, color: colors.faint },
  reset: {
    borderWidth: 0,
    padding: 0,
    fontSize: 10,
    textAlign: "left",
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: "transparent",
  },
});
const clamp = (v: number) => Math.round(Math.max(-LIMIT, Math.min(LIMIT, v)));

/** Drag the accent point away from the frame to place its shadow. */
export function ShadowOffsetControl({
  label,
  value,
  inner,
  onChange,
}: {
  label: string;
  value: FrameShadow;
  inner?: boolean;
  onChange: (value: FrameShadow, key?: string) => void;
}) {
  const pressed = useRef(false);
  const gesture = useGestureKey(`${label}-offset`);
  const set = (x: number, y: number) =>
    onChange({ ...value, x: clamp(x), y: clamp(y) }, gesture.key);
  return (
    <div {...stylex.props(styles.layout)}>
      <button
        type="button"
        aria-label={`${label} position. Drag to move, arrow keys to nudge, Home to centre.`}
        aria-description={`Horizontal ${value.x} pixels, vertical ${value.y} pixels`}
        {...stylex.props(styles.pad)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pressed.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          set(
            (((e.clientX - r.left) / r.width - 0.5) * LIMIT) / 0.4,
            (((e.clientY - r.top) / r.height - 0.5) * LIMIT) / 0.4,
          );
        }}
        onPointerMove={(e) => {
          if (!pressed.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          set(
            (((e.clientX - r.left) / r.width - 0.5) * LIMIT) / 0.4,
            (((e.clientY - r.top) / r.height - 0.5) * LIMIT) / 0.4,
          );
        }}
        onPointerUp={() => {
          pressed.current = false;
          gesture.renew();
        }}
        onPointerCancel={() => {
          pressed.current = false;
          gesture.renew();
        }}
        onKeyDown={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          const step = e.shiftKey ? 10 : 1;
          const delta = (
            {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            } as Record<string, number[]>
          )[e.key];
          if (delta || e.key === "Home") {
            e.stopPropagation();
            e.preventDefault();
            set(delta ? value.x + delta[0]! : 0, delta ? value.y + delta[1]! : 0);
          }
        }}
        onKeyUp={gesture.renew}
      >
        <span {...stylex.props(styles.axisX)} />
        <span {...stylex.props(styles.axisY)} />
        <span
          {...stylex.props(
            styles.frame,
            inner
              ? styles.inner(value.x / 8, value.y / 8, value.blur / 8, value.color)
              : styles.shadow(value.x / 8, value.y / 8, value.blur / 8, value.color),
          )}
        />
        <span {...stylex.props(styles.dot, styles.position(value.x, value.y))} />
      </button>
      <div {...stylex.props(styles.fields)}>
        <span {...stylex.props(styles.hint)}>
          Drag the dot to position
          <br />
          the shadow.
        </span>
        <Field prefix="X">
          <NumberField
            bare
            label={`${label} horizontal offset`}
            value={value.x}
            min={-LIMIT}
            max={LIMIT}
            suffix="px"
            onChange={(x) => set(x, value.y)}
            onCommitEnd={gesture.renew}
          />
        </Field>
        <Field prefix="Y">
          <NumberField
            bare
            label={`${label} vertical offset`}
            value={value.y}
            min={-LIMIT}
            max={LIMIT}
            suffix="px"
            onChange={(y) => set(value.x, y)}
            onCommitEnd={gesture.renew}
          />
        </Field>
        <button
          type="button"
          aria-label={`Centre ${label.toLowerCase()}`}
          onClick={() => onChange({ ...value, x: 0, y: 0 })}
          {...stylex.props(styles.reset)}
        >
          Centre shadow
        </button>
      </div>
    </div>
  );
}
