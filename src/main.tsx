import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/caveat";
import "@fontsource/bebas-neue";
import "./ui/theme/reset.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installGlobalErrorHandlers } from "./app/errors";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

installGlobalErrorHandlers();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
