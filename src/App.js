import { useCallback, useRef } from "react";
import { set } from "idb-keyval";
import { loadingStateAtom } from "./atoms";
import { useRecoilState } from "recoil";
import { Video } from "./components/Video";
import "./styles.css";

const App = () => {
  const [loadingState, setLoadingState] = useRecoilState(loadingStateAtom);

  const cursorDivRef = useRef();

  const onMouseMove = useCallback(
    (e) => {
      const video = document.querySelector("#video");
      if (loadingState !== "loaded" || !video.duration) {
        return;
      }
      const rect = e.target.getBoundingClientRect();
      const cursorPosition = e.clientX - rect.x;
      const percentage = cursorPosition / rect.width;
      cursorDivRef.current.style.transform = `translateX(${cursorPosition}px)`;
      video.currentTime = video.duration * percentage;
    },
    [loadingState]
  );

  const handleFileOpen = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      await set("file", file);
      setLoadingState("loaded");
    } catch (e) {}
  };

  return (
    <div className="App">
      <h1>Video Editor</h1>
      <button onClick={handleFileOpen}>Select a video</button>
      <p>
        <div>
          <div ref={cursorDivRef} className="cursor" />
          <div className="scrubble" onMouseMove={onMouseMove} />
        </div>
      </p>
      <Video />
    </div>
  );
};

export default App;
