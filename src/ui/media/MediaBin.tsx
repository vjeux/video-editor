import * as stylex from "@stylexjs/stylex";
import { useDeferredValue, useState } from "react";
import { useEditor, useMedia } from "../../store";
import { PanelHeader } from "../controls/PanelHeader";
import { Icon } from "../controls/Icon";
import { Button } from "../controls/Button";
import { colors } from "../theme/tokens.stylex";
import { AssetCard } from "./AssetCard";
import { FilterChips } from "./FilterChips";
import { matchesMedia, type MediaFilter } from "./filters";
import { ImportDropZone } from "./ImportDropZone";
import { ImportingCard } from "./ImportingCard";
import { ReconnectBanner } from "./ReconnectBanner";
import { SearchBox } from "./SearchBox";

const styles = stylex.create({
  bin: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  count: {
    fontSize: 10,
    color: colors.muted,
    whiteSpace: "nowrap",
    backgroundColor: colors.panel2,
    paddingBlock: 2,
    paddingInline: 7,
    borderRadius: 5,
  },
  grid: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    alignContent: "start",
    gap: 10,
    paddingTop: 0,
    paddingInline: 12,
    paddingBottom: 12,
  },
  empty: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    paddingBlock: 28,
    paddingInline: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontWeight: 500, color: colors.text, marginBottom: 6 },
  foot: {
    padding: 12,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
    fontSize: 10,
    color: colors.faint,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
});

export function MediaBin() {
  const assets = useEditor((s) => s.project.assets);
  const clips = useEditor((s) => s.project.clips);
  const importing = useMedia((s) =>
    Object.entries(s.assets).some(([id, asset]) => asset.status === "loading" && !assets[id]),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");

  const all = Object.values(assets);
  const used = new Set(
    Object.values(clips).flatMap((c) => (c.type === "media" ? [c.assetId] : [])),
  );
  // Typing stays responsive; filtering a large bin renders at lower priority.
  const deferredQuery = useDeferredValue(query);
  const visible = all.filter((a) => matchesMedia(a, filter, deferredQuery));

  return (
    <aside aria-label="Media" {...stylex.props(styles.bin)}>
      <PanelHeader title="Your media" icon="folder">
        <span {...stylex.props(styles.count)}>
          {all.length} {all.length === 1 ? "item" : "items"}
        </span>
      </PanelHeader>
      <ImportDropZone expanded={all.length === 0} />
      <ReconnectBanner />
      {all.length > 0 && (
        <>
          <SearchBox value={query} onChange={setQuery} />
          <FilterChips value={filter} onChange={setFilter} />
        </>
      )}
      <div {...stylex.props(styles.grid)}>
        {visible.map((asset) => (
          <AssetCard key={asset.id} asset={asset} used={used.has(asset.id)} />
        ))}
        {importing && <ImportingCard />}
        {visible.length === 0 && !importing && (
          <div {...stylex.props(styles.empty)}>
            <Icon name={all.length === 0 ? "folder" : "search"} size={26} />
            <div>
              <div {...stylex.props(styles.emptyTitle)}>
                {all.length === 0 ? "A home for your footage" : "No matching media"}
              </div>
              {all.length === 0
                ? "Add videos, audio, or images. Then drag them onto your timeline."
                : "Try another search or reset your filters."}
            </div>
            {all.length > 0 && (
              <Button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
      <div {...stylex.props(styles.foot)}>
        <Icon name="lock" size={11} />
        Stored on this device · No uploads
      </div>
    </aside>
  );
}
