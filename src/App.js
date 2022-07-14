import { useCallback, useRef } from "react";
import { set } from "idb-keyval";
import { loadingStateAtom, durationStateAtom } from "./atoms";
import { useRecoilState, useRecoilValue } from "recoil";
import { Video } from "./components/Video";
import "./styles.css";
import { Timeline } from "./components/Timeline";

const App = () => {
  const [, setLoadingState] = useRecoilState(loadingStateAtom);
  const [videoDuration, setVideoDuration] = useRecoilState(durationStateAtom);

  const getDuration = useCallback((file, stateSetter) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = function () {
      window.URL.revokeObjectURL(video.src);
      stateSetter(video.duration);
    };
    video.src = URL.createObjectURL(file);
  }, []);

  const handleFileOpen = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      await set("file", file);
      getDuration(file, setVideoDuration);
      setLoadingState("loaded");
    } catch (e) {}
  };

  return (
    <div className="App">
      <h1>Video Editor</h1>
      <button onClick={handleFileOpen}>Select a video</button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          overflow: "scroll",
        }}
      >
        <Video />
        <Timeline duration={videoDuration} />
      </div>
    </div>
  );
};

export default App;
