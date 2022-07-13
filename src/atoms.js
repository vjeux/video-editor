import { atom } from "recoil";

export const loadingStateAtom = atom({
  key: "loadingState",
  default: "idle",
});
