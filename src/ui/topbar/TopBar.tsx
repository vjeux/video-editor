import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { projectDuration } from "../../core/timeline";
import { chooseAndOpen, openFiles, saveProjectFile } from "../../app/project-files";
import { reportError } from "../../app/errors";
import { useEditor } from "../../store";
import { useSession } from "../../store/session";
import type { MenuEntry } from "../../store/context-menu";
import { Icon } from "../controls/Icon";
import { useDismiss } from "../controls/use-dismiss";
import type { Rect } from "../controls/placement";
import { MenuPanel } from "../menu/MenuPanel";
import { ACCEPTED_FILES } from "../media/dnd";
import { colors, radii } from "../theme/tokens.stylex";
import { setTheme, useTheme, type Theme } from "../theme/use-theme";
import { SavedStatus } from "./SavedStatus";

const mod = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";
const styles = stylex.create({
  bar: {
    height: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingInline: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  menu: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.md,
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
  open: { backgroundColor: colors.panel2, color: colors.text },
  divider: { height: 18, width: 1, backgroundColor: colors.line, flexShrink: 0 },
  name: {
    width: "24ch",
    minWidth: 40,
    flexShrink: 1,
    paddingBlock: 5,
    paddingInline: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: "transparent", ":hover": colors.line2, ":focus": colors.accent },
    backgroundColor: { default: "transparent", ":focus": colors.panel },
    outline: "none",
    fontWeight: 500,
    color: colors.text,
    textOverflow: "ellipsis",
    userSelect: "text",
  },
  grow: { flexGrow: 1 },
});

interface PanelToggles {
  library: boolean;
  inspector: boolean;
  toggle: (panel: "library" | "inspector") => void;
}

export function TopBar({
  onExport,
  onScript,
  onHelp,
  panels,
}: {
  onExport: () => void;
  onScript: () => void;
  onHelp: () => void;
  panels?: PanelToggles;
}) {
  const name = useEditor((s) => s.project.name);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const hasContent = useEditor((s) => projectDuration(s.project) > 0);
  const commit = useEditor((s) => s.commit);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const busy = useSession((s) => s.fileTask);
  const theme = useTheme();
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const close = () => {
    setAnchor(null);
    button.current?.focus({ preventScroll: true });
  };
  useDismiss(close, anchor !== null, button);
  const entries: MenuEntry[] = [
    {
      kind: "item",
      label: busy === "opening" ? "Opening…" : "Open…",
      icon: "folder",
      shortcut: `${mod}O`,
      disabled: !!busy,
      run: () => void chooseAndOpen(input.current).catch(reportError),
    },
    {
      kind: "item",
      label: busy === "saving" ? "Saving project…" : "Save project…",
      icon: "save",
      shortcut: `${mod}S`,
      disabled: !!busy,
      run: () => void saveProjectFile().catch(reportError),
    },
    { kind: "separator" },
    {
      kind: "item",
      label: "Undo",
      icon: "undo",
      shortcut: `${mod}Z`,
      disabled: !canUndo,
      run: undo,
    },
    {
      kind: "item",
      label: "Redo",
      icon: "redo",
      shortcut: `⇧${mod}Z`,
      disabled: !canRedo,
      run: redo,
    },
    { kind: "separator" },
    { kind: "item", label: "Script…", icon: "code", run: onScript },
    { kind: "item", label: "Export video…", icon: "export", disabled: !hasContent, run: onExport },
    { kind: "separator" },
    {
      kind: "submenu",
      label: "Theme",
      icon: "theme",
      entries: (
        [
          ["dark", "Dark"],
          ["light", "Light"],
          ["system", "System"],
        ] as [Theme, string][]
      ).map(([value, label]) => ({
        kind: "item",
        label,
        checked: theme === value,
        run: () => setTheme(value),
      })),
    },
    ...(panels
      ? [
          {
            kind: "submenu" as const,
            label: "Panels",
            icon: "panelLeft",
            entries: [
              {
                kind: "item" as const,
                label: "Library",
                icon: "panelLeft",
                checked: panels.library,
                run: () => panels.toggle("library"),
              },
              {
                kind: "item" as const,
                label: "Inspector",
                icon: "panelRight",
                checked: panels.inspector,
                run: () => panels.toggle("inspector"),
              },
            ],
          },
        ]
      : []),
    { kind: "item", label: "Help", icon: "help", shortcut: "?", run: onHelp },
  ];
  return (
    <header {...stylex.props(styles.bar)}>
      <button
        ref={button}
        type="button"
        aria-label="Cutline menu"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={() => {
          if (anchor) return close();
          const rect = button.current!.getBoundingClientRect();
          setAnchor({ x: rect.x, y: rect.bottom + 7, width: 0, height: 0 });
        }}
        {...stylex.props(styles.menu, anchor !== null && styles.open)}
      >
        <Icon name="menu" size={19} />
      </button>
      <span {...stylex.props(styles.divider)} />
      <input
        aria-label="Project name"
        value={name}
        onChange={(e) =>
          commit((p) => ({ ...p, name: e.target.value }), { coalesce: "project-name" })
        }
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        {...stylex.props(styles.name)}
      />
      <div {...stylex.props(styles.grow)} />
      <SavedStatus />
      <input
        ref={input}
        id="open-project-files"
        aria-label="Open project or media files"
        type="file"
        hidden
        multiple
        accept={`${ACCEPTED_FILES},.cutline,.glsl,.frag,.fs,.cube,.json`}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void openFiles(files).catch(reportError);
        }}
      />
      {anchor && <MenuPanel entries={entries} anchor={anchor} side="below" onClose={close} />}
    </header>
  );
}
