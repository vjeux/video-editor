import { lazy } from "react";

const loadExport = () => import("../dialogs/ExportDialog");
const loadScript = () => import("../dialogs/ScriptDialog");
const loadStudio = () => import("../studio/EffectStudio");
const loadCaptions = () => import("../dialogs/CaptionsDialog");

/** Split out of the main bundle: the script dialog carries CodeMirror. */
export const ExportDialog = lazy(() => loadExport().then((m) => ({ default: m.ExportDialog })));
export const EffectStudio = lazy(() => loadStudio().then((m) => ({ default: m.EffectStudio })));
/** Carries the speech-model client; the model itself loads only when captions run. */
export const CaptionsDialog = lazy(() =>
  loadCaptions().then((m) => ({ default: m.CaptionsDialog })),
);
export const ScriptDialog = lazy(() => loadScript().then((m) => ({ default: m.ScriptDialog })));

/** Warms both chunks once the browser is idle so the first open is instant. */
export function preloadDialogs(): () => void {
  const id = requestIdleCallback(() => {
    void loadExport();
    void loadScript();
  });
  return () => cancelIdleCallback(id);
}
