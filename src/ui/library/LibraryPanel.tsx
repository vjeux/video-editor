import * as stylex from "@stylexjs/stylex";
import { useId, useState, type ComponentType } from "react";
import { MediaBin } from "../media/MediaBin";
import { colors } from "../theme/tokens.stylex";
import { AnimationBrowser } from "./AnimationBrowser";
import { EffectBrowser } from "./EffectBrowser";
import { LibraryTabs } from "./LibraryTabs";
import type { LibraryTab } from "./tabs";
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
  tabs: { flexShrink: 0 },
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
  const id = useId();
  const [tab, setTab] = useState<LibraryTab>("media");
  const View = VIEWS[tab];
  return (
    <section aria-label="Library" {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.tabs)}>
        <LibraryTabs id={id} value={tab} onChange={setTab} />
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        {...stylex.props(styles.view)}
      >
        <View />
      </div>
    </section>
  );
}
