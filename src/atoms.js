import { atom, atomFamily, selectorFamily } from "recoil";

export const loadingStateAtom = atom({
  key: "loadingState",
  default: "idle",
});

export const durationStateAtom = atom({
  key: "durationStateAtom",
  default: 0,
});

export const rangeStateAtom = atomFamily({
  key: "rangeStateAtom",
  default: selectorFamily({
    key: "rangeStateAtom/Default",
    get: (data) => () => {
      return data;
    },
  }),
});
