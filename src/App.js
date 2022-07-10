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
  return (
    <div className="App">
      <h1>Video Editor</h1>
      <p>
        Select a video:{" "}
        <input
          type="file"
          onChange={(e) => {
            if (!e.target.files[0]) {
              return;
            }
            extractFrame(e.target.files[0]).then();
          }}
        />
      </p>
      <p>
        <div
          style={{
            display: "inline-block",
            width: 600,
            height: 20,
            backgroundColor: "purple"
          }}
          onMouseMove={(e) => {
            const video = document.querySelector("#video");
            if (isLoading || !video.duration) {
              return;
            }
            isLoading = true;
            const rect = e.target.getBoundingClientRect();
            const percentage = (e.clientX - rect.x) / rect.width;
            video.currentTime = video.duration * percentage;
          }}
        />
      </p>
      <p>
        <canvas id="canvas" width="600" height="400" />
      </p>
      <p>
        <video
          width="600"
          height="400"
          id="video"
          controls
          style={{ display: "none" }}
        >
          <source id="source" />
        </video>
      </p>
    </div>
  );
}
