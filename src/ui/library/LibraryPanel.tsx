import * as stylex from "@stylexjs/stylex";
import { useState, type ComponentType } from "react";
import { Segmented } from "../controls/Segmented";
import { MediaBin } from "../media/MediaBin";
import { colors } from "../theme/tokens.stylex";
import { AnimationBrowser } from "./AnimationBrowser";
import { EffectBrowser } from "./EffectBrowser";
import { LIBRARY_TABS, type LibraryTab } from "./tabs";
import { TransitionBrowser } from "./TransitionBrowser";

const VIEWS: Record<LibraryTab, ComponentType> = {
  media: MediaBin,
  effects: EffectBrowser,
  transitions: TransitionBrowser,
  animations: AnimationBrowser,
};

const styles = stylex.create({
  panel: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  tabs: {
    flexShrink: 0,
    paddingTop: 8,
    paddingInline: 12,
    paddingBottom: 0,
  },
  view: {
    flexGrow: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr)",
    gridTemplateColumns: "minmax(0, 1fr)",
  },
});

/** The left panel: media, effects, transitions and animations, one tab at a time. */
export function LibraryPanel() {
  const [tab, setTab] = useState<LibraryTab>("media");
  const View = VIEWS[tab];
  return (
    <section aria-label="Library" {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.tabs)}>
        <Segmented label="Library" value={tab} options={LIBRARY_TABS} onChange={setTab} compact />
      </div>
      <div {...stylex.props(styles.view)}>
        <View />
      </div>
    </section>
  );
}
