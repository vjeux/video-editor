import { cursorPositionStateAtom, rangeStateAtom } from "../atoms";
import { useCallback, useEffect, useRef } from "react";

import { useRecoilState, useRecoilValue } from "recoil";

import { TimelinePreview } from "./TimelinePreview";
import { generateRange } from "../utils";
import { FixedSizeList as List } from "react-window";

const ITEM_SIZE = 100;
const LIST_WIDTH = 800;

export const Timeline = ({ duration }) => {
  const cursorDivRef = useRef();
  const timelineDivRef = useRef();
  const range = useRecoilValue(rangeStateAtom([...generateRange(duration)]));
  const [, setCursorPosition] = useRecoilState(cursorPositionStateAtom);

  const onMouseMove = useCallback(
    (e) => {
      const video = document.querySelector("#video");
      const rect = timelineDivRef.current.getBoundingClientRect();
      const cursorPosition = e.clientX - rect.x;
      cursorDivRef.current.style.transform = `translateX(${cursorPosition}px)`;
      const percentage = cursorPosition / rect.width;
      // video.currentTime = video.duration * percentage;
      setCursorPosition(cursorPosition);
    },
    [setCursorPosition]
  );

  useEffect(() => {
    const listElement = document.querySelector(".list");
    listElement.addEventListener("mousemove", onMouseMove);
    return () => listElement.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  return (
    <div
      style={{
        height: 150,
        display: "flex",
        backgroundColor: "white",
        margin: 30,
        padding: 10,
        width: 800,
      }}
      ref={timelineDivRef}
    >
      <div
        ref={cursorDivRef}
        style={{
          display: "inline-block",
          width: 4,
          height: 150,
          backgroundColor: "green",
          position: "absolute",
        }}
      />
      <List
        height={150}
        itemCount={range.length}
        itemSize={ITEM_SIZE}
        itemData={range}
        layout="horizontal"
        width={LIST_WIDTH}
        className="list"
        ref={timelineDivRef}
      >
        {TimelinePreview}
      </List>
    </div>
  );
};
