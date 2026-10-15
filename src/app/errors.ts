import { noticeStore } from "../store/notices";

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/** The single place errors surface to the user. */
export function reportError(error: unknown) {
  if (isAbort(error)) return;
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  noticeStore.getState().push("error", message);
}

export function installGlobalErrorHandlers() {
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
  window.addEventListener("error", (event) => reportError(event.error ?? event.message));
}
