import * as stylex from "@stylexjs/stylex";
import { startTransition, useActionState, useDeferredValue, useRef, useState } from "react";
import { deleteCustomEffect, exportEffects, saveCustomEffect } from "../../app/effects";
import type { EffectKind, Params } from "../../core/types";
import { useEditor } from "../../store";
import { noticeStore } from "../../store/notices";
import type { StudioTarget } from "../../store/studio";
import { Button } from "../controls/Button";
import { Dialog } from "../dialogs/Dialog";
import { colors } from "../theme/tokens.stylex";
import { analyzeSource, saveFailureMessage } from "./analyze";
import { ConfirmButton } from "./ConfirmButton";
import { EditorToolbar } from "./EditorToolbar";
import { GlslEditor } from "./GlslEditor";
import type { GlslEditorHandle } from "./glsl-language";
import { useDebouncedValue, useWindowKeydown } from "./hooks";
import { ImportButton } from "./ImportButton";
import { ParamPanel } from "./ParamPanel";
import { paramValues } from "./params";
import { ShaderReference } from "./ShaderReference";
import { draftDefinition, effectCategories, initialDraft, type StudioMeta } from "./studio-draft";
import { StudioFields } from "./StudioFields";
import { StudioPreview } from "./StudioPreview";
import { DEFAULT_NAMES, TEMPLATES } from "./templates";

/** Typing pause after which the source is parsed and compiled. */
const COMPILE_DELAY_MS = 250;

const styles = stylex.create({
  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.75fr)",
    gap: 14,
    height: "min(64vh, 660px)",
    minHeight: 380,
  },
  editorColumn: { display: "flex", flexDirection: "column", gap: 8, minWidth: 0, minHeight: 0 },
  side: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto",
  },
  actions: { display: "flex", alignItems: "center", gap: 8 },
  status: { color: colors.faint, fontSize: 12 },
  failure: { color: colors.danger },
});

interface SaveFailure {
  /** The source that failed; the message is dropped once the code changes. */
  source: string;
  message: string;
}

/** The studio for one target: GLSL editor, live preview, parameters and save. */
export function StudioDialog({ target, onClose }: { target: StudioTarget; onClose: () => void }) {
  const customEffects = useEditor((s) => s.project.customEffects);
  const [draft] = useState(() => initialDraft(target, customEffects));
  const [source, setSource] = useState(draft.source);
  const [meta, setMeta] = useState<StudioMeta>({
    name: draft.name,
    category: draft.category,
    description: draft.description,
  });
  const [tweaks, setTweaks] = useState<Params>({});
  const editor = useRef<GlslEditorHandle>(null);

  // Compile once typing pauses, rendering the result at low priority so keystrokes stay instant.
  const settled = useDebouncedValue(source, COMPILE_DELAY_MS);
  const analysis = analyzeSource(useDeferredValue(settled), draft.id, draft.lut);
  // The last version that compiled keeps the preview and parameters up while errors are fixed.
  const [compiled, setCompiled] = useState(analysis.errors.length === 0 ? analysis : null);
  if (analysis.errors.length === 0 && analysis.source !== compiled?.source) setCompiled(analysis);

  const def = compiled?.def ?? null;
  const saved = draft.saved && Object.hasOwn(customEffects, draft.id);
  const dirty =
    source !== draft.source ||
    meta.name !== draft.name ||
    meta.category !== draft.category ||
    meta.description !== draft.description;

  const [failure, save, saving] = useActionState(
    (_previous: SaveFailure | null, attempt: { source: string; meta: StudioMeta }) => {
      try {
        const definition = draftDefinition(draft, attempt.source, attempt.meta);
        saveCustomEffect(definition);
        noticeStore.getState().push("info", `Saved “${definition.name}”`);
        onClose();
        return null;
      } catch (error) {
        return { source: attempt.source, message: saveFailureMessage(error) };
      }
    },
    null,
  );
  const requestSave = () => {
    if (!saving) startTransition(() => save({ source, meta }));
  };
  const requestClose = () => {
    if (!dirty || window.confirm("Discard your changes to this shader?")) onClose();
  };

  useWindowKeydown((e) => {
    if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") {
      e.preventDefault();
      requestSave();
    }
  });

  const applyTemplate = (kind: EffectKind) => {
    setSource(TEMPLATES[kind]);
    if (Object.values(DEFAULT_NAMES).includes(meta.name)) {
      setMeta({ ...meta, name: DEFAULT_NAMES[kind] });
    }
  };

  const shownFailure = failure?.source === source ? failure : null;

  return (
    <Dialog
      title={`Effect Studio · ${meta.name.trim() || "Untitled"}`}
      size="studio"
      dismissable={!dirty}
      onClose={requestClose}
      note={
        <span {...stylex.props(styles.actions)}>
          <ImportButton onImported={onClose} />
          {saved && (
            <Button
              title="Download the saved version as an effect pack"
              onClick={() => exportEffects([draft.id], customEffects[draft.id]?.name ?? meta.name)}
            >
              Export
            </Button>
          )}
          {saved && (
            <ConfirmButton
              variant="danger"
              confirmLabel="Click again to delete"
              title="Remove this effect from the project"
              onConfirm={() => {
                deleteCustomEffect(draft.id);
                onClose();
              }}
            >
              Delete
            </ConfirmButton>
          )}
        </span>
      }
      footer={
        <>
          <span role="status" {...stylex.props(styles.status, shownFailure && styles.failure)}>
            {shownFailure?.message ?? "⌘S to save"}
          </span>
          <Button
            variant="primary"
            title="Save to the project (⌘S)"
            onClick={requestSave}
            disabled={saving}
          >
            {saved ? "Save changes" : "Save effect"}
          </Button>
        </>
      }
    >
      <StudioFields
        meta={meta}
        categories={effectCategories(customEffects)}
        onChange={(patch) => setMeta({ ...meta, ...patch })}
      />
      <div {...stylex.props(styles.workspace)}>
        <div {...stylex.props(styles.editorColumn)}>
          <EditorToolbar
            kind={analysis.def?.kind ?? null}
            empty={source.trim() === ""}
            onTemplate={applyTemplate}
          />
          <GlslEditor ref={editor} value={source} onChange={setSource} checked={analysis} />
        </div>
        <div {...stylex.props(styles.side)}>
          <StudioPreview
            def={def}
            params={def ? paramValues(def.params, tweaks) : {}}
            errors={analysis.errors}
            onJump={(line) => editor.current?.goToLine(line)}
          />
          {def && (
            <ParamPanel
              defs={def.params}
              values={paramValues(def.params, tweaks)}
              tweaked={Object.keys(tweaks).length > 0}
              onChange={(key, value) => setTweaks({ ...tweaks, [key]: value })}
              onReset={() => setTweaks({})}
            />
          )}
          <ShaderReference />
        </div>
      </div>
    </Dialog>
  );
}
