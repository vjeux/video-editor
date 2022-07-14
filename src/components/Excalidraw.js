import React, { useEffect, useState, useRef } from "react";
import {
  Excalidraw,
  loadLibraryFromBlob,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";

import "./style.css";

export default function App(props) {
  const excalidrawRef = useRef(null);
  //   const libraryItemsRef = useRef(props.libraryItems);
  //   const [imageParams, setImageParams] = useState(props.imageParams);

  useEffect(() => {
    if (!props.dirty) {
      return;
    }
    if (props.initialData) {
      const { elements, appState, files } = props.initialData;
      props.onChange(elements, appState, files);
    } else {
      props.onChange(
        [],
        { gridSize: null, viewBackgroundColor: "#ffffff" },
        {}
      );
    }
  }, []);

  useEffect(() => {
    const listener = async (e) => {
      try {
        const message = e.data;
        switch (message.type) {
          case "image-params-change": {
            // setImageParams(message.imageParams);
          }
          default:
            return null;
        }
      } catch (e) {}
    };
    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    };
  }, []);

  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        ref={excalidrawRef}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        name={props.name}
        viewModeEnabled={props.viewModeEnabled}
        initialData={{
          //   ...props.initialData,
          libraryItems: props.libraryItems,
          scrollToContent: true,
        }}
        libraryReturnUrl={"vscode://pomdtr.excalidraw-editor/importLib"}
        onChange={
          (elements, appState, files) => {}
          //   props.onChange(
          //     elements,
          //     { ...appState, ...imageParams, exportEmbedScene: true },
          //     files
          //   )
        }
        onLinkOpen={() => {}}
      />
    </div>
  );
}
