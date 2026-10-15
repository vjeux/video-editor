import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { cpp, cppLanguage } from "@codemirror/lang-cpp";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, type Diagnostic } from "@codemirror/lint";
import { EditorState, type Extension, type Text } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { ShaderError } from "../../engine/gpu";
import { codeTheme } from "../dialogs/code-theme";
import { glslCompletions } from "./glsl-completions";

/** Imperative bits the studio needs from its editor. */
export interface GlslEditorHandle {
  /** Puts the cursor at the start of a 1-based line, scrolls to it and focuses the editor. */
  goToLine: (line: number) => void;
}

const DANGER = "#ff5d6c";
const squiggle = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23ff5d6c' fill='none' stroke-width='.8'/%3E%3C/svg%3E")`;

// `&.cm-editor` outranks the shared code theme, which caps the height for dialogs.
const studioTheme = EditorView.theme(
  {
    "&.cm-editor": { height: "100%", maxHeight: "none" },
    "&.cm-editor .cm-scroller": { overflow: "auto" },
    "&.cm-editor .cm-content, &.cm-editor .cm-gutter": { minHeight: "100%" },
    "&.cm-editor .cm-lintRange-error": { backgroundImage: squiggle },
    "&.cm-editor .cm-lintRange-active": { backgroundColor: "rgba(255, 93, 108, 0.14)" },
    ".cm-gutter-lint": { width: "1em" },
    ".cm-gutter-lint .cm-gutterElement": { padding: "0 0 0 4px" },
    ".cm-diagnostic": {
      padding: "5px 10px 5px 8px",
      fontFamily: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: "11.5px",
    },
    "&.cm-editor .cm-diagnostic-error": { borderLeft: `3px solid ${DANGER}` },
    ".cm-diagnosticSource": { color: "#8b91a1" },
  },
  { dark: true },
);

/** GLSL tokens the shared JavaScript-oriented palette leaves plain. */
const glslHighlight = HighlightStyle.define([
  { tag: [t.typeName, t.standard(t.typeName)], color: "#7cc4f2" },
  { tag: [t.processingInstruction, t.macroName], color: "#e3a63b" },
  { tag: t.modifier, color: "#c06cf2" },
]);

/** Everything the studio editor needs apart from its change listener. */
export const glslSetup: Extension = [
  lineNumbers(),
  lintGutter(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  history(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  cpp(),
  cppLanguage.data.of({ autocomplete: glslCompletions }),
  indentUnit.of("  "),
  EditorState.tabSize.of(2),
  keymap.of([
    ...closeBracketsKeymap,
    ...completionKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,
  ]),
  EditorView.contentAttributes.of({ "aria-label": "GLSL source", spellcheck: "false" }),
  codeTheme,
  syntaxHighlighting(glslHighlight),
  studioTheme,
];

/** Compile errors as lint diagnostics spanning their (trimmed) source line. */
export function diagnosticsFor(doc: Text, errors: readonly ShaderError[]): Diagnostic[] {
  return errors.flatMap(({ line, message }) => {
    if (line === null) return [];
    const target = doc.line(Math.min(Math.max(line, 1), doc.lines));
    const from = target.from + (target.text.length - target.text.trimStart().length);
    return [{ from, to: target.to, severity: "error", message, source: "GLSL" }];
  });
}
