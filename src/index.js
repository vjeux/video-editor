import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RecoilRoot } from "recoil";

import App from "./App";

const worker = new Worker(new URL('./worker.js', import.meta.url));

/*
worker.postMessage({ call: 'processFrame' });

worker.onmessage = ({ data: { answer } }) => {
  console.log(answer);
};
*/

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App worker={worker} />
  </StrictMode>
);
