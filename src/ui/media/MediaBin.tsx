import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { useEditor, useMedia } from "../../store";
import { PanelHeader } from "../controls/PanelHeader";
import { colors } from "../theme/tokens.stylex";
import { AssetCard } from "./AssetCard";
import { FilterChips } from "./FilterChips";
import { matchesMedia, type MediaFilter } from "./filters";
import { ImportDropZone } from "./ImportDropZone";
import { ImportingCard } from "./ImportingCard";
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
  count: { fontSize: 11, color: colors.faint, whiteSpace: "nowrap" },
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
    color: colors.faint,
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "center",
  },
});

export function MediaBin() {
  const assets = useEditor((s) => s.project.assets);
  const clips = useEditor((s) => s.project.clips);
  const known = useMedia((s) => Object.keys(s.assets).length);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");

  const all = Object.values(assets);
  const used = new Set(
    Object.values(clips).flatMap((c) => (c.type === "media" ? [c.assetId] : [])),
  );
  const visible = all.filter((a) => matchesMedia(a, filter, query));
  const importing = known > all.length;

  return (
    <aside aria-label="Media" {...stylex.props(styles.bin)}>
      <PanelHeader title="Media">
        <span {...stylex.props(styles.count)}>{all.length} items</span>
      </PanelHeader>
      <SearchBox value={query} onChange={setQuery} />
      <FilterChips value={filter} onChange={setFilter} />
      <div {...stylex.props(styles.grid)}>
        {visible.map((asset) => (
          <AssetCard key={asset.id} asset={asset} used={used.has(asset.id)} />
        ))}
        {importing && <ImportingCard />}
        {visible.length === 0 && !importing && (
          <div {...stylex.props(styles.empty)}>
            {all.length === 0
              ? "Import video, audio or images to get started. Everything stays on your device."
              : "No media matches."}
          </div>
        )}
      </div>
      <ImportDropZone />
    </aside>
  );
}
