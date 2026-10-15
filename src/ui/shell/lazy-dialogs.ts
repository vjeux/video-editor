import { lazy } from "react";

const loadExport = () => import("../dialogs/ExportDialog");
const loadScript = () => import("../dialogs/ScriptDialog");
const loadStudio = () => import("../studio/EffectStudio");

/** Split out of the main bundle: the script dialog carries CodeMirror. */
export const ExportDialog = lazy(() => loadExport().then((m) => ({ default: m.ExportDialog })));
export const EffectStudio = lazy(() => loadStudio().then((m) => ({ default: m.EffectStudio })));
export const ScriptDialog = lazy(() => loadScript().then((m) => ({ default: m.ScriptDialog })));

/** Warms both chunks once the browser is idle so the first open is instant. */
export function preloadDialogs(): () => void {
  const id = requestIdleCallback(() => {
    void loadExport();
    void loadScript();
  });
  return () => cancelIdleCallback(id);
}
