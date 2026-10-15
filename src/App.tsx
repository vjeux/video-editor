import { Suspense, ViewTransition } from "react";
import { Editor } from "./ui/shell/Editor";
import { Splash } from "./ui/shell/Splash";

/** The editor suspends until the saved session is restored; the splash cross-fades out. */
export function App() {
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
