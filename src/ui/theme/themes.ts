import * as stylex from "@stylexjs/stylex";
import { colors, shadows } from "./tokens.stylex";

const lightColors = stylex.createTheme(colors, {
  bg: "#f5f6f9",
  panel: "#ffffff",
  panel2: "#eef0f5",
  panel3: "#e4e7ef",
  stage: "#e8ebf2",
  lanes: "#f0f2f7",
  line: "#dfe3ec",
  line2: "#c5ccda",
  text: "#242938",
  muted: "#5e687d",
  faint: "#738097",
  accent: "#7055e8",
  accentHover: "#6044d8",
  onAccent: "#ffffff",
  accent2: "#674aca",
  accentSoft: "rgba(112, 85, 232, 0.09)",
  accentRing: "rgba(112, 85, 232, 0.3)",
  pink: "#ba377a",
  video: "#3d6df2",
  video2: "#2a4fb8",
  title: "#9852cc",
  audio: "#168565",
  audioDeep: "#165c49",
  music: "#a97110",
  danger: "#cb354b",
  dangerSoft: "rgba(203, 53, 75, 0.09)",
  field: "#f0f2f7",
  fieldHover: "#e9ecf3",
  raised: "#ffffff",
  raisedHover: "#f0f2f7",
  popover: "rgba(255, 255, 255, 0.98)",
  highlight: "rgba(40, 50, 80, 0.06)",
});

const lightShadows = stylex.createTheme(shadows, {
  frame: "0 20px 60px rgba(25, 35, 60, 0.15)",
  pop: "0 12px 30px rgba(25, 35, 60, 0.15)",
  dialog: "0 30px 80px rgba(25, 35, 60, 0.2)",
  focus: "0 0 0 2px #7055e8",
  ring: "0 0 0 3px rgba(112, 85, 232, 0.2)",
  well: "inset 0 1px 2px rgba(25, 35, 60, 0.04)",
  raised: "0 1px 2px rgba(25, 35, 60, 0.08)",
  popover:
    "0 0 0 1px rgba(25, 35, 60, 0.1), 0 16px 48px rgba(25, 35, 60, 0.16), 0 3px 10px rgba(25, 35, 60, 0.08)",
  thumb: "0 1px 3px rgba(25, 35, 60, 0.2), 0 0 0 0.5px rgba(25, 35, 60, 0.15)",
});

export const lightThemeClass = stylex.props(lightColors, lightShadows).className!;
