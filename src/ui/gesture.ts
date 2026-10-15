import { useState } from "react";

let gestures = 0;
/** A fresh coalesce key per pointer gesture so one drag is one undo step. */
export function useGestureKey(field: string) {
  const [key, setKey] = useState(() => `${field}:${++gestures}`);
  return { key, renew: () => setKey(`${field}:${++gestures}`) };
}
