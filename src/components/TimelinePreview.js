import { get } from "idb-keyval";
import { useEffect } from "react";

async function setFrame(duration, canvasId, imageId) {
  const file = await get("file");
  const video = document.createElement("video");
  const source = document.createElement("source");
  video.appendChild(source);
  source.src = URL.createObjectURL(file);

  const img = document.getElementById(imageId);
  const canvas = document.getElementById(canvasId);

  video.currentTime = duration;
  video.load();
  video.ontimeupdate = async function () {
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    img.src = canvas.toDataURL();
  };
  // canvas.remove();
  // video.remove();
  // source.remove();
}

export const TimelinePreview = ({ duration, id }) => {
  const canvasId = `preview-canvas-${id}`;
  const imageId = `preview-image-${id}`;
  useEffect(() => {
    setFrame(duration, canvasId, imageId).then();
  }, [canvasId, duration, imageId]);

  return (
    <>
      <canvas
        id={canvasId}
        style={{ width: 20, height: 20, display: "none" }}
      />
      <img id={imageId} style={{ width: "100%", height: 100 }} />
    </>
  );
};
