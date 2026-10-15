import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { applyEffect } from "../../app/effects";
import type { Id } from "../../core/types";
import { allEffects } from "../../effects/resolve";
import { useEditor } from "../../store";
import { colors, radii } from "../theme/tokens.stylex";
import { groupByCategory } from "./effect-stack";

const styles = stylex.create({
  picker: {
    marginBottom: 10,
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accent,
    backgroundColor: colors.bg,
  },
  search: {
    display: "block",
    width: "100%",
    height: 30,
    paddingBlock: 0,
    paddingInline: 10,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    backgroundColor: "transparent",
    fontSize: 12,
    color: colors.text,
    outline: "none",
  },
  list: { maxHeight: 240, overflowY: "auto", padding: 4 },
  category: {
    paddingTop: 6,
    paddingBottom: 2,
    paddingInline: 6,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: colors.faint,
  },
  option: {
    display: "block",
    width: "100%",
    height: 26,
    paddingBlock: 0,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radii.sm,
    backgroundColor: {
      default: "transparent",
      ":hover": colors.panel3,
      ":focus-visible": colors.panel3,
    },
    fontSize: 12,
    color: colors.text,
    textAlign: "start",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    outline: "none",
  },
  empty: { margin: 0, padding: 8, fontSize: 11.5, color: colors.faint },
});

/** Searchable list of every effect, grouped by category; picking one appends it to the clip. */
export function EffectPicker({ clipId, onClose }: { clipId: Id; onClose: () => void }) {
  const customEffects = useEditor((s) => s.project.customEffects);
  const [query, setQuery] = useState("");
  const categories = groupByCategory(allEffects({ customEffects }), "effect", query);
  const pick = (effectId: string) => {
    applyEffect(effectId, [clipId]);
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-label="Add effect"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        onClose();
      }}
      {...stylex.props(styles.picker)}
    >
      <input
        type="search"
        aria-label="Search effects"
        placeholder="Search effects…"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          const first = categories[0]?.effects[0];
          if (e.key === "Enter" && first) pick(first.id);
        }}
        {...stylex.props(styles.search)}
      />
      <div {...stylex.props(styles.list)}>
        {categories.length === 0 && <p {...stylex.props(styles.empty)}>No effects match.</p>}
        {categories.map((c) => (
          <div key={c.name} role="group" aria-label={c.name}>
            <div aria-hidden {...stylex.props(styles.category)}>
              {c.name}
            </div>
            {c.effects.map((def) => (
              <button
                key={def.id}
                type="button"
                title={def.description}
                onClick={() => pick(def.id)}
                {...stylex.props(styles.option)}
              >
                {def.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
