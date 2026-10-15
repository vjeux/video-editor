import * as stylex from "@stylexjs/stylex";
import { useEffect } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { colors } from "./tokens.stylex";
import { lightThemeClass } from "./themes";

export type Theme = "dark" | "light" | "system";
const KEY = "cutline-theme";
const readTheme = (): Theme => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
};
const themeStore = createStore<{ theme: Theme }>(() => ({ theme: readTheme() }));
export const useTheme = () => useStore(themeStore, (s) => s.theme);
export function setTheme(theme: Theme) {
  themeStore.setState({ theme });
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // The selected theme still works when browser storage is unavailable.
  }
}

const styles = stylex.create({
  root: { backgroundColor: colors.bg, color: colors.text },
  dark: { colorScheme: "dark" },
  light: { colorScheme: "light" },
});

/** Theme the document so portals, menus and dialogs inherit the same tokens. */
export function useThemeRoot() {
  const theme = useTheme();
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    let applied: string[] = [];
    const apply = () => {
      const light = theme === "light" || (theme === "system" && !query.matches);
      document.documentElement.classList.remove(...applied);
      applied = stylex.props(styles.root, light ? styles.light : styles.dark).className!.split(" ");
      if (light) applied.push(...lightThemeClass.split(" "));
      document.documentElement.classList.add(...applied);
    };
    apply();
    query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      document.documentElement.classList.remove(...applied);
    };
  }, [theme]);
}
