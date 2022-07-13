import { useCallback, useRef } from "react";
import { set } from 'idb-keyval';

import "./styles.css";

let isLoading = false;

async function extractFrame(file) {
  const source = document.querySelector("#source");
  source.src = URL.createObjectURL(file);

  const video = document.querySelector("#video");
  video.load();
  video.ontimeupdate = async function () {
    isLoading = false;
    console.log("onload");
    const stream = video.captureStream();
    const tracks = stream.getTracks();
    const track = tracks.find((track) => track.kind === "video");
    if (!track) {
      return;
    }

    const trackProcessor = new window.MediaStreamTrackProcessor(track);

    const reader = trackProcessor.readable.getReader();
    const result = await reader.read();
    if (result.done) {
      return;
    }
    const frame = result.value;

    const canvas = document.querySelector("#canvas");
    const context = canvas.getContext("2d");
    context.drawImage(
      frame,
      0,
      0,
      frame.codedWidth,
      frame.codedHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
    frame.close();
  };
}

export default function App() {
  const cursorDivRef = useRef();

  const onMouseMove = useCallback((e) => {

    const video = document.querySelector("#video");
    if (isLoading || !video.duration) {
      return;
    }
    isLoading = true;
    const rect = e.target.getBoundingClientRect();
    const cursorPosition = e.clientX - rect.x;
    const percentage = cursorPosition / rect.width;
    cursorDivRef.current.style.transform = `translateX(${cursorPosition}px)`;
    video.currentTime = video.duration * percentage;
  }, []);

  const handleFileOpen = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      await set('file', file);
      await extractFrame(file);
    } catch (e) {}
  }

  return (
    <div className="App">
      <h1>Video Editor</h1>
      <button onClick={handleFileOpen}>
        Select a video:{" "}
      </button>
      <p>
        <div>
          <div ref={cursorDivRef} style={{ display: "inline-block", width: 4, height: 20, backgroundColor: "green", position: "absolute"}} />
          <div style={{ display: "inline-block", width: 600, height: 20, backgroundColor: "purple"}} onMouseMove={onMouseMove} />
        </div>
      </p>
      <p>
        <canvas id="canvas" width="600" height="400" />
      </p>
      <p>
        <video width="600" height="400" id="video" controls style={{ display: "none" }}>
          <source id="source" />
        </video>
      </p>
    </div>
  );
}

