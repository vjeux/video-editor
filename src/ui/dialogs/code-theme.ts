import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { colors } from "../theme/tokens.stylex";

// CodeMirror styles its own DOM through this CSS-in-JS API; values mirror the app tokens.
const palette = {
  bg: colors.bg,
  gutter: colors.panel2,
  activeLine: colors.highlight,
  line: colors.line,
  text: colors.text,
  faint: colors.faint,
  muted: colors.muted,
  accent: colors.accent,
  selection: colors.accentRing,
  keyword: colors.title,
  string: colors.audio,
  number: colors.music,
  member: colors.accent2,
  panel: colors.panel,
};

const theme = EditorView.theme(
  {
    "&": {
      maxHeight: "55vh",
      backgroundColor: palette.bg,
      color: palette.text,
      fontSize: "12px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace',
      lineHeight: "1.55",
      overflow: "auto",
    },
    ".cm-content, .cm-gutter": { minHeight: "300px" },
    ".cm-content": { caretColor: palette.accent, paddingBlock: "8px" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: palette.accent, borderLeftWidth: "2px" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: palette.selection },
    ".cm-gutters": {
      backgroundColor: palette.gutter,
      color: palette.faint,
      borderRight: `1px solid ${palette.line}`,
    },
    ".cm-lineNumbers .cm-gutterElement": { paddingInline: "10px 8px" },
    ".cm-activeLine": { backgroundColor: palette.activeLine },
    ".cm-activeLineGutter": { backgroundColor: palette.panel, color: palette.text },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgba(124, 108, 255, 0.22)",
      outline: `1px solid ${palette.accent}`,
    },
    ".cm-tooltip": {
      backgroundColor: palette.panel,
      color: palette.text,
      border: `1px solid ${palette.line}`,
      borderRadius: "7px",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "inherit", maxHeight: "14em" },
    ".cm-tooltip-autocomplete > ul > li": { paddingInline: "8px" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: palette.accent,
      color: "#fff",
    },
    ".cm-completionDetail": { color: palette.muted, fontStyle: "normal", marginLeft: "8px" },
    ".cm-completionInfo": { padding: "6px 9px", maxWidth: "280px" },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword],
    color: palette.keyword,
  },
  { tag: [t.string, t.special(t.string), t.regexp], color: palette.string },
  { tag: [t.number, t.bool, t.null, t.atom], color: palette.number },
  {
    tag: [t.propertyName, t.function(t.variableName), t.function(t.propertyName)],
    color: palette.member,
  },
  { tag: [t.comment, t.lineComment, t.blockComment], color: palette.faint, fontStyle: "italic" },
  { tag: [t.variableName, t.definition(t.variableName)], color: palette.text },
  { tag: [t.operator, t.punctuation, t.bracket], color: palette.muted },
]);

export const codeTheme: Extension = [theme, syntaxHighlighting(highlight)];
