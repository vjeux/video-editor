import { Excalidraw as ExcalidrawComponent } from "@excalidraw/excalidraw";

import "./style.css";

export const Excalidraw = () => {
  return (
    <div className="excalidraw-wrapper">
      <ExcalidrawComponent
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        onChange={() => {}}
        onLinkOpen={() => {}}
      />
    </div>
  );
};
