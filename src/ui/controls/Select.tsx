import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { colors, sizes } from "../theme/tokens.stylex";
import { Icon } from "./Icon";
import { ListRow } from "./ListRow";
import type { Rect } from "./placement";
import { Popover } from "./Popover";
import { stepEnabled } from "./roving";
import { surfaces } from "./surfaces";
import { useDismiss } from "./use-dismiss";

export interface SelectOption<V extends string> {
  value: V;
  label: string;
  /** Shown as the option's tooltip. */
  hint?: string;
  disabled?: boolean;
  /** Previews the label in this font family. */
  font?: string;
}

export type SelectEntry<V extends string> =
  | SelectOption<V>
  | { group: string; options: readonly SelectOption<V>[] };

type Row<V extends string> =
  | { kind: "header"; label: string }
  | { kind: "option"; option: SelectOption<V> };

const flatten = <V extends string>(entries: readonly SelectEntry<V>[]): Row<V>[] =>
  entries.flatMap((e): Row<V>[] =>
    "group" in e
      ? [
          { kind: "header", label: e.group },
          ...e.options.map((option) => ({ kind: "option" as const, option })),
        ]
      : [{ kind: "option", option: e }],
  );

const styles = stylex.create({
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    paddingBlock: 0,
    paddingInlineStart: 9,
    paddingInlineEnd: 7,
    fontSize: 12,
    textAlign: "start",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.45 },
  },
  open: { borderColor: colors.accent },
  compact: {
    width: "auto",
    height: sizes.controlSm,
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: { default: colors.panel, ":hover": colors.panel2 },
    boxShadow: "none",
  },
  value: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  placeholder: { color: colors.faint },
  font: (family: string) => ({ fontFamily: `"${family}", system-ui, sans-serif` }),
  chevron: { color: colors.faint, flexShrink: 0 },
  list: { maxHeight: 340, overflowY: "auto", overscrollBehavior: "contain" },
  header: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingInline: 8,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: colors.faint,
  },
});

/**
 * Dropdown with a styled listbox: groups, a placeholder when the value
 * matches no option (for "Add…" style pickers), typeahead and font previews.
 */
export function Select<V extends string>({
  value,
  options,
  onChange,
  label,
  placeholder = "Choose…",
  compact,
  disabled,
}: {
  value: V | "";
  options: readonly SelectEntry<V>[];
  onChange: (value: V) => void;
  label: string;
  placeholder?: string;
  /** Toolbar-sized variant. */
  compact?: boolean;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [active, setActive] = useState(-1);

  const rows = flatten(options);
  const enabled = rows.map((r) => r.kind === "option" && !r.option.disabled);
  const selectedIndex = rows.findIndex((r) => r.kind === "option" && r.option.value === value);
  const selected = rows[selectedIndex];
  const current = selected?.kind === "option" ? selected.option : null;

  const close = (refocus: boolean) => {
    setAnchor(null);
    if (refocus) trigger.current?.focus();
  };
  useDismiss(() => close(false), anchor !== null, trigger);
  // Open with the current choice in view, as a native select does.
  useLayoutEffect(() => {
    if (anchor)
      panel.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  }, [anchor]);

  const open = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    setAnchor({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    setActive(selectedIndex >= 0 ? selectedIndex : stepEnabled(enabled, -1, 1));
  };
  const pick = (row: Row<V> | undefined) => {
    if (row?.kind !== "option" || row.option.disabled) return;
    close(true);
    if (row.option.value !== value) onChange(row.option.value);
  };
  const moveTo = (index: number) => {
    setActive(index);
    panel.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const typeahead = (key: string) => {
    const order = rows.map((_, i) => (active + 1 + i) % rows.length);
    const hit = order.find((i) => {
      const r = rows[i];
      return (
        r?.kind === "option" && !r.option.disabled && r.option.label.toLowerCase().startsWith(key)
      );
    });
    if (hit !== undefined) moveTo(hit);
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const keys: Record<string, () => void> = {
      ArrowDown: () => moveTo(stepEnabled(enabled, active, 1)),
      ArrowUp: () => moveTo(stepEnabled(enabled, active, -1)),
      Home: () => moveTo(stepEnabled(enabled, -1, 1)),
      End: () => moveTo(stepEnabled(enabled, -1, -1)),
      Enter: () => pick(rows[active]),
      " ": () => pick(rows[active]),
      Escape: () => close(true),
      Tab: () => close(true),
    };
    const handler = keys[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      typeahead(e.key.toLowerCase());
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={anchor !== null}
        disabled={disabled}
        onClick={() => (anchor ? close(true) : open())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            open();
          }
        }}
        {...stylex.props(
          surfaces.well,
          styles.trigger,
          anchor !== null && styles.open,
          compact && styles.compact,
        )}
      >
        <span
          {...stylex.props(
            styles.value,
            !current && styles.placeholder,
            current?.font !== undefined && styles.font(current.font),
          )}
        >
          {current?.label ?? placeholder}
        </span>
        <span {...stylex.props(styles.chevron)}>
          <Icon name="chevronDown" size={13} strokeWidth={2.2} />
        </span>
      </button>
      {anchor && (
        <Popover
          ref={panel}
          anchor={anchor}
          role="listbox"
          label={label}
          minWidth={anchor.width}
          onKeyDown={onListKey}
        >
          <div {...stylex.props(styles.list)}>
            {rows.map((row, i) =>
              row.kind === "header" ? (
                <div key={`h:${row.label}`} role="presentation" {...stylex.props(styles.header)}>
                  {row.label}
                </div>
              ) : (
                <ListRow
                  key={row.option.value}
                  role="option"
                  index={i}
                  label={row.option.label}
                  labelFont={row.option.font}
                  title={row.option.hint}
                  lead={
                    i === selectedIndex ? <Icon name="check" size={13} strokeWidth={2.4} /> : null
                  }
                  leadTone="accent"
                  selected={i === selectedIndex}
                  active={i === active}
                  disabled={row.option.disabled}
                  onHover={() => setActive(i)}
                  onPick={() => pick(row)}
                />
              ),
            )}
          </div>
        </Popover>
      )}
    </>
  );
}
