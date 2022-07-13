import { get } from "idb-keyval";
import { useCallback } from "react";
import { loadingStateAtom } from "../atoms";
import { useRecoilValue } from "recoil";

export const Video = () => {
  const loadingState = useRecoilValue(loadingStateAtom);

  const onVideoLoad = useCallback(
    async (video) => {
      if (loadingState === "loaded") {
        const file = await get("file");
        const source = document.querySelector("#source");
        source.src = URL.createObjectURL(file);

        video.load();
        video.ontimeupdate = async function () {
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
    },
    [loadingState]
  );

  return (
    <div>
      <canvas id="canvas" width="600" height="400" />
      <video
        ref={onVideoLoad}
        width="600"
        height="400"
        id="video"
        controls
        style={{ display: "none" }}
      >
        <source id="source" />
      </video>
    </div>
  );
};
