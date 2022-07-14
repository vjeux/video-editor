import { rangeStateAtom, loadingStateAtom } from "../atoms";
import { useCallback, useEffect, useRef } from "react";

import { useRecoilState, useRecoilValue } from "recoil";

import { TimelinePreview } from "./TimelinePreview";
import { generateRange, getSeconds } from "../utils";

export const Timeline = ({ duration }) => {
  const cursorDivRef = useRef();
  const timelineDivRef = useRef();
  const [range, setRange] = useRecoilState(rangeStateAtom);
  const loadingState = useRecoilValue(loadingStateAtom);

  useEffect(() => {
    const _range = ["00:00:01", ...generateRange(duration)].sort((a, b) => {
      if (a && b) {
        return getSeconds(a) - getSeconds(b);
      }
      return 1;
    });

    setRange(_range);
  }, [duration, setRange]);

  const onMouseMove = useCallback(
    (e) => {
      const video = document.querySelector("#video");
      if (loadingState !== "loaded" || !video.duration) {
        return;
      }
      const rect = timelineDivRef.current.getBoundingClientRect();
      const cursorPosition = e.clientX - rect.x;
      const percentage = cursorPosition / rect.width;
      cursorDivRef.current.style.transform = `translateX(${cursorPosition}px)`;
      video.currentTime = video.duration * percentage;
    },
    [loadingState]
  );

  return (
    <div
      style={{
        height: 200,
        width: 1200,
        display: "flex",
        backgroundColor: "white",
        margin: 10,
      }}
    >
      <div
        ref={cursorDivRef}
        style={{
          display: "inline-block",
          width: 4,
          height: 200,
          backgroundColor: "green",
          position: "absolute",
        }}
      />
      <div
        ref={timelineDivRef}
        style={{
          display: "flex",
          alignItems: "center",
          height: 200,
          width: 1200,
          flexGrow: 1,
          justifyContent: "space-around",
          overflow: "scroll",
        }}
        onMouseMove={onMouseMove}
      >
        {range.map((r, i) => (
          <div style={{ display: "flex", flexDirection: "column" }} key={r}>
            <p style={{ margin: "0px 2rem 1rem" }}>{r}</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
              key={r}
            >
              <TimelinePreview id={i} duration={getSeconds(r)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
