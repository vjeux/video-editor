import { setDiagnostics } from "@codemirror/lint";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";
import { colors, radii } from "../theme/tokens.stylex";
import type { Analysis } from "./analyze";
import { diagnosticsFor, glslSetup, type GlslEditorHandle } from "./glsl-language";

const styles = stylex.create({
  frame: {
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    // Pins CodeMirror to the frame so long lines scroll inside it instead of widening it.
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr)",
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus-within": colors.accent },
    userSelect: "text",
  },
});

/**
 * CodeMirror GLSL editor. `checked` is the latest compile result; its errors
 * show as lint diagnostics once the document matches the source they belong to.
 */
export function GlslEditor({
  value,
  onChange,
  checked,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  checked: Analysis;
  ref?: Ref<GlslEditorHandle>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const emitChange = useEffectEvent((doc: string) => onChange(doc));

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        extensions: [
          glslSetup,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) emitChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  // Mirrors external replacements (the initial source, a template) without echoing edits.
  // Filling an empty editor stays out of the undo history; replacing code can be undone.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(editor.state.doc.length > 0),
    });
  }, [value]);

  // Diagnostics for an older source are left to CodeMirror, which maps them through edits.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() !== checked.source) return;
    editor.dispatch(setDiagnostics(editor.state, diagnosticsFor(editor.state.doc, checked.errors)));
  }, [checked]);

  useImperativeHandle(ref, () => ({
    goToLine(line) {
      const editor = view.current;
      if (!editor) return;
      const { doc } = editor.state;
      const { from } = doc.line(Math.min(Math.max(line, 1), doc.lines));
      editor.dispatch({
        selection: { anchor: from },
        effects: EditorView.scrollIntoView(from, { y: "center" }),
      });
      editor.focus();
    },
  }));

  return <div ref={host} {...stylex.props(styles.frame)} />;
}
