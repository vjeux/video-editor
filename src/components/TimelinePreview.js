import { get } from "idb-keyval";
import { useCallback, useEffect, useRef } from "react";
import { getSeconds } from "../utils";

export const TimelinePreview = ({ data, index, style }) => {
  const canvasRef = useRef();
  const imgRef = useRef();
  const ref = useRef();
  const range = data[index];
  const tempo = getSeconds(range);

  const setFrame = useCallback(async () => {
    const file = await get("file");
    const video = document.createElement("video");
    const source = document.createElement("source");
    video.appendChild(source);
    source.src = URL.createObjectURL(file);

    const img = imgRef.current;
    const canvas = canvasRef.current;

    video.currentTime = tempo;
    video.load();
    video.ontimeupdate = async function () {
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      img.src = canvas.toDataURL();
    };
  }, [tempo]);

  const onMouseMove = useCallback(() => {
    const video = document.querySelector("#video");
    video.currentTime = tempo;
  }, [tempo]);

  useEffect(() => {
    const div = ref.current;
    div.addEventListener("mousemove", onMouseMove);
    return () => div.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  useEffect(() => {
    // setFrame().then();
  }, []);

  // return null;
  return (
    <div
      style={{
        width: 150,
        height: 150,
        display: "flex",
        flexDirection: "column",
        // justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
      ref={ref}
    >
      {/* <canvas
        ref={canvasRef}
        style={{ width: 20, height: 20, display: "none" }}
      /> */}
      <p>{range}</p>
      {/* <img ref={imgRef} alt="" style={{ width: 100, height: 100 }} /> */}
    </div>
  );
};
