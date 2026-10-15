import * as stylex from "@stylexjs/stylex";
import { DialogField } from "../dialogs/DialogField";
import type { StudioMeta } from "./studio-draft";
import { StudioTextField } from "./StudioTextField";

const styles = stylex.create({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.6fr)",
    gap: 10,
  },
});

/** Name, category and description; these win over the source's metadata tags on save. */
export function StudioFields({
  meta,
  categories,
  onChange,
}: {
  meta: StudioMeta;
  categories: readonly string[];
  onChange: (patch: Partial<StudioMeta>) => void;
}) {
  return (
    <div {...stylex.props(styles.fields)}>
      <DialogField label="Name">
        <StudioTextField
          label="Name"
          value={meta.name}
          placeholder="Untitled effect"
          onChange={(name) => onChange({ name })}
        />
      </DialogField>
      <DialogField label="Category">
        <StudioTextField
          label="Category"
          value={meta.category}
          placeholder="Custom"
          suggestions={categories}
          onChange={(category) => onChange({ category })}
        />
      </DialogField>
      <DialogField label="Description">
        <StudioTextField
          label="Description"
          value={meta.description}
          placeholder="What it does, shown in the library"
          onChange={(description) => onChange({ description })}
        />
      </DialogField>
    </div>
  );
}
