import { Suspense, ViewTransition } from "react";
import { Editor } from "./ui/shell/Editor";
import { Splash } from "./ui/shell/Splash";
import { useThemeRoot } from "./ui/theme/use-theme";

/** The editor suspends until the saved session is restored; the splash cross-fades out. */
export function App() {
  useThemeRoot();
  return (
    <Suspense
      fallback={
        <ViewTransition exit="fade-out">
          <Splash />
        </ViewTransition>
      }
    >
      <ViewTransition enter="fade-in">
        <Editor />
      </ViewTransition>
    </Suspense>
  );
}
