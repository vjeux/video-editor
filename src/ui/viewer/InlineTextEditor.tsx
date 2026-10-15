import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState } from "react";
import { updateClip } from "../../app/commands";
import type { TextClip } from "../../core/types";
import { editorStore } from "../../store";
import { colors } from "../theme/tokens.stylex";
import { textLayoutOf, type Box } from "./layer-box";
import { textEditFrame, type TextEditFrame } from "./text-edit-frame";

let sessions = 0;

const styles = stylex.create({
  editor: {
    position: "absolute",
    margin: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    // The canvas keeps drawing the styled title underneath; this layer only
    // provides the caret and the selection, so what you see is the result.
    color: "transparent",
    caretColor: colors.accent2,
    outline: "none",
    resize: "none",
    overflow: "hidden",
    whiteSpace: "pre",
    overflowWrap: "normal",
    transformOrigin: "center",
    cursor: "text",
    userSelect: "text",
    "::selection": { backgroundColor: "rgba(124, 108, 255, 0.4)" },
  },
  frame: (f: TextEditFrame) => ({
    left: f.left,
    top: f.top,
    width: f.width,
    height: f.height,
    padding: f.padding,
    fontSize: f.fontSize,
    lineHeight: `${f.lineHeight}px`,
    letterSpacing: f.letterSpacing,
    transform: `rotate(${f.rotation}deg)`,
  }),
  type: (family: string, weight: number, align: string) => ({
    fontFamily: `"${family}", system-ui, sans-serif`,
    fontWeight: weight,
    textAlign: align,
  }),
});

const closeEditor = () => editorStore.getState().editText(null);

/**
 * Edits a title in place on the program monitor. Every keystroke updates the
 * clip (one undo step for the whole session); Escape, ⌘Enter or clicking away
 * finishes, and an emptied title goes back to its text from before.
 */
export function InlineTextEditor({
  clip,
  box,
  scale,
}: {
  clip: TextClip;
  box: Box;
  /** Displayed pixels per project pixel. */
  scale: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [session] = useState(() => ({ key: `inline-text:${++sessions}`, before: clip.text }));
  const frame = textEditFrame(box, textLayoutOf(clip), clip.style, {
    display: scale,
    clip: clip.transform.scale,
  });

  useLayoutEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.select();
  }, []);

  const setText = (text: string) =>
    updateClip(clip.id, (c) => (c.type === "text" ? { ...c, text } : c), session.key);

  const finish = () => {
    if (!clip.text.trim()) setText(session.before);
    closeEditor();
  };

  return (
    <textarea
      ref={ref}
      aria-label="Title text"
      wrap="off"
      spellCheck={false}
      value={clip.text}
      onChange={(e) => setText(e.target.value)}
      onBlur={finish}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      {...stylex.props(
        styles.editor,
        styles.frame(frame),
        styles.type(clip.style.fontFamily, clip.style.fontWeight, clip.style.align),
      )}
    />
  );
}
