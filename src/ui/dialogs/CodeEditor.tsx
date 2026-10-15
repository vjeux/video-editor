import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { EditorState, Prec, Transaction } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useRef } from "react";
import { colors, radii } from "../theme/tokens.stylex";
import { codeTheme } from "./code-theme";
import { scriptCompletions } from "./script-completions";

const styles = stylex.create({
  frame: {
    minWidth: 0,
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus-within": colors.accent },
    userSelect: "text",
  },
});

/** CodeMirror JavaScript editor for timeline scripts; ⌘↵ / Ctrl+↵ calls `onRun`. */
export function CodeEditor({
  value,
  onChange,
  onRun,
  label = "Script",
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const emitChange = useEffectEvent((doc: string) => onChange(doc));
  const run = useEffectEvent(() => onRun());

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          javascript(),
          javascriptLanguage.data.of({ autocomplete: scriptCompletions }),
          indentUnit.of("  "),
          EditorState.tabSize.of(2),
          Prec.highest(
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  run();
                  return true;
                },
              },
            ]),
          ),
          keymap.of([
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) emitChange(update.state.doc.toString());
          }),
          codeTheme,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [label]);

  // Mirrors external replacements (initial load, "Load example") without echoing user edits.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [value, label]);

  return <div ref={host} {...stylex.props(styles.frame)} />;
}
