import { atom } from "recoil";

export const loadingStateAtom = atom({
  key: "loadingState",
  default: "idle",
});

export const durationStateAtom = atom({
  key: "durationStateAtom",
  default: 0,
});

export const rangeStateAtom = atom({
  key: "rangeStateAtom",
  default: [],
});
