import "./styles.css";

import { useState, useEffect, useRef } from 'react';
import loadMP4Module from "./mp4.js";


function createVideoFile(file) {
  const videoElement = document.createElement('video');
  videoElement.style = 'display: none';
  const sourceElement = document.createElement('source');
  sourceElement.src = URL.createObjectURL(file);
  videoElement.appendChild(sourceElement);
  document.body.appendChild(videoElement);

  return {
    file,
    videoElement,
    sourceElement
  };
}

function asyncGetDuration(videoFile) {
  return new Promise((resolve, reject) => {
    const videoElement = videoFile.videoElement;
    const listener = (event) => {
      videoElement.removeEventListener('durationchange', listener);
      resolve(videoElement.duration);
    };
    videoElement.addEventListener('durationchange', listener);
  });
}

var RANDOM_COLORS = ['red', 'green', 'blue', 'orange', 'yellow'];
function getRandomColor() {
  const randomColor = RANDOM_COLORS.shift();
  RANDOM_COLORS.push(randomColor);
  return randomColor;
}

function getReaderFromVideoElement(videoElement) {
  const stream = videoElement.captureStream();
  const tracks = stream.getVideoTracks();
  const track = tracks[0];
  if (!track) {
  return null;
  }
  const trackProcessor = new window.MediaStreamTrackProcessor(track);
  return trackProcessor.readable.getReader();
}

async function extractFrameFromVideoFile(videoFile, time, targetCanvas) {
  await new Promise((resolve) => {
    const videoElement = videoFile.videoElement;

    const listener = async function() {
      videoElement.removeEventListener('timeupdate', listener);

      const reader = getReaderFromVideoElement(videoElement);
      if (!reader) {
        return;
      }

      const result = await reader.read();
      if (result.done) {
        return;
      }
      const frame = result.value;

      const context = targetCanvas.getContext('2d');

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        frame,
        0,
        0,
        frame.codedWidth,
        frame.codedHeight,
        0,
        0,
        targetCanvas.width,
        targetCanvas.height
      );
      frame.close();
      resolve();
    }
    videoElement.addEventListener('timeupdate', listener);

    videoElement.currentTime = time;
  })
}

// https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
class PromiseQueue {
  static queue = [];
  static pendingPromise = false;

  static enqueue(promise) {
    return new Promise((resolve, reject) => {
      this.queue.push({
          promise,
          resolve,
          reject,
      });
      this.dequeue();
    });
  }

  static dequeue() {
    if (this.workingOnPromise) {
      return false;
    }
    const item = this.queue.shift();
    if (!item) {
      return false;
    }
    try {
      this.workingOnPromise = true;
      item.promise()
        .then((value) => {
          this.workingOnPromise = false;
          item.resolve(value);
          this.dequeue();
        })
        .catch(err => {
          this.workingOnPromise = false;
          item.reject(err);
          this.dequeue();
        })
    } catch (err) {
      this.workingOnPromise = false;
      item.reject(err);
      this.dequeue();
    }
    return true;
  }
}

function Preview({clip, time}) {
  const canvasElement = useRef(null);

  useEffect(() => {
//    PromiseQueue.enqueue(() => extractFrameFromVideoFile(clip.videoFile, time, canvasElement.current));
  }, [clip, time]);

  return (
    <canvas
      ref={canvasElement}
      width={140}
      height={80}
      style={{width: 70, height: 40, display: 'inline-block'}}
    />
  );
}

async function record(videoElement) {  
  const reader = getReaderFromVideoElement(videoElement);
  if (!reader) {
    return;
  }

  const width = 1920;
  const height = 1080;
  const fps = 30;
  const MP4 = await loadMP4Module();
  const encoder = MP4.createWebCodecsEncoder({
    width,
    height,
    fps
  });
  const duration = videoElement.duration;
  console.log(videoElement.duration);

  let currentTime = 0;
  let frameCount = 0;
  const startNow = performance.now();

  const listener = async () => {
    reader.read().then(async (frame) => {
      if (frame.value) {
        const bitmap = await createImageBitmap(frame.value);
        await encoder.addFrame(bitmap);
        frameCount++;

        if (frameCount % 10 === 0) {
          console.log("Encoding " + Math.round(100 * currentTime / duration) + "% " + Math.round(1000 * frameCount / (performance.now() - startNow)) + " fps");
        }
        frame.value.close();
      }
      if (currentTime < duration) {
        currentTime += 1/fps;
        videoElement.currentTime = currentTime;
      } else {
        videoElement.removeEventListener('timeupdate', listener);
        const data = await encoder.end();
        const url = URL.createObjectURL(new Blob([data], { type: "video/mp4" }));

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "download.mp4";
        anchor.click();
      }
    });
  }
  videoElement.addEventListener('timeupdate', listener);
  videoElement.currentTime = currentTime;
}

export default function App({worker}) {
  const [tracks, setTracks] = useState(
    [
      {
        clips: []
      }
    ]
  );

  const windowStart = 0;
  const windowEnd = Math.max(0, ...tracks[0].clips.map(clip => clip.end));
  const windowWidth = document.body.clientWidth;

  return (
    <div className="App">
      <h1>Video Editor</h1>
      <p>
        Select a video:{" "}
        <input
          type="file"
          multiple
          onChange={async function (e) {
            if (!e.target.files[0]) {
              return;
            }
            let newTracks = [...tracks];
            for (var i = 0; i < e.target.files.length; ++i) {
              const file = e.target.files[i];
              const videoFile = createVideoFile(file);
              const start = Math.max(0, ...newTracks[0].clips.map(clip => clip.end));
              const duration = await asyncGetDuration(videoFile);
              newTracks[0].clips.push({
                start: start,
                end: start + duration,
                videoFile,
                backgroundColor: getRandomColor()
              });
            }
            setTracks(newTracks);
          }}
        />
      </p>

      <div>
        <h2>Tracks</h2>
        {tracks.map((track, i) =>
          <div key={'track' + i}>
            {track.clips.map(clip => {
              const width = ((clip.end - clip.start) / (windowEnd - windowStart)) * windowWidth;
              return (
                <div
                  style={{
                    display: 'inline-block',
                    width,
                    left: (clip.start / (windowEnd - windowStart)) * windowWidth,
                    height: 45,
                    background: clip.backgroundColor,
                    overflow: 'hidden',
                    whiteSpace: 'pre',
                  }}
                  key={clip.start}
                >
                  {Array.from({length: Math.ceil(width / 70)}).map((_, i) =>
                    <Preview
                      clip={clip}
                      key={'preview' + i}
                      time={Math.min(clip.end - clip.start, (70 * (i + 0.5) * (windowEnd - windowStart)) / windowWidth)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={async () => {
            await record(tracks[0].clips[0].videoFile.videoElement)
          }}
        >
          Generate video
        </button>
      </div>
    </div>
  );
}
