import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

export interface Notice {
  id: number;
  tone: "error" | "info" | "success";
  message: string;
  description?: string;
}

interface NoticeState {
  notices: Notice[];
  push: (tone: Notice["tone"], message: string, description?: string) => void;
  dismiss: (id: number) => void;
}

let next = 0;

export const noticeStore = createStore<NoticeState>()((set) => ({
  notices: [],
  push: (tone, message, description) =>
    set((s) => ({ notices: [...s.notices, { id: ++next, tone, message, description }].slice(-4) })),
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
}));

export const useNotices = () => useStore(noticeStore, (s) => s.notices);
