import * as stylex from "@stylexjs/stylex";
import { assetMenu, openMenu } from "../../app/menus";
import { addAssetToTimeline, deleteAsset } from "../../app/assets";
import { reportError } from "../../app/errors";
import { reconnectMedia } from "../../app/session";
import { formatDuration, formatFps } from "../../core/time";
import type { Asset, AssetKind } from "../../core/types";
import { useMedia } from "../../store";
import { BitmapCanvas } from "../controls/BitmapCanvas";
import { Icon } from "../controls/Icon";
import type { IconName } from "../controls/icon-paths";
import { Spinner } from "../controls/Spinner";
import { colors, fonts, radii } from "../theme/tokens.stylex";
import { AssetWaveform } from "./AssetWaveform";
import { ASSET_MIME } from "./dnd";

const KIND_ICON: Record<AssetKind, IconName> = { video: "film", audio: "music", image: "image" };

const styles = stylex.create({
  card: {
    position: "relative",
    minWidth: 0,
    borderRadius: radii.md,
    cursor: "grab",
  },
  thumb: {
    position: "relative",
    aspectRatio: "16 / 10",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, [stylex.when.ancestor(":hover")]: colors.line2 },
    boxShadow: {
      default: "none",
      [stylex.when.ancestor(":hover")]: `inset 0 0 0 1.5px ${colors.accent}`,
    },
    backgroundColor: colors.bg,
    color: colors.faint,
  },
  audio: { backgroundColor: "#12261f" },
  broken: {
    borderColor: {
      default: "rgba(255, 93, 108, 0.5)",
      [stylex.when.ancestor(":hover")]: "rgba(255, 93, 108, 0.5)",
    },
  },
  used: {
    position: "absolute",
    left: 5,
    top: 5,
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: colors.audio,
    boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.4)",
  },
  duration: {
    position: "absolute",
    right: 4,
    bottom: 4,
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#eee",
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  fps: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#cfd3dc",
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  reconnect: {
    borderWidth: 0,
    color: colors.accent,
    cursor: "pointer",
    pointerEvents: "auto",
  },
  badge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: colors.danger,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  remove: {
    position: "absolute",
    right: 4,
    top: 4,
    zIndex: 1,
    width: 20,
    height: 20,
    padding: 0,
    borderWidth: 0,
    borderRadius: 5,
    display: "grid",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover")]: 1,
      [stylex.when.ancestor(":focus-within")]: 1,
      "@media (hover: none)": 1,
    },
    placeItems: "center",
    backgroundColor: { default: "rgba(0, 0, 0, 0.65)", ":hover": "rgba(0, 0, 0, 0.85)" },
    color: { default: "#ddd", ":hover": colors.danger },
    cursor: "pointer",
  },
  add: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 26,
    height: 26,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    borderRadius: radii.md,
    display: "grid",
    placeItems: "center",
    backgroundColor: { default: colors.panel2, ":hover": colors.accent },
    color: "#fff",
    cursor: "pointer",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover")]: 1,
      [stylex.when.ancestor(":focus-within")]: 1,
      "@media (hover: none)": 1,
    },
  },
  name: {
    marginTop: 5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 11,
    color: colors.muted,
  },
});

export function AssetCard({ asset, used }: { asset: Asset; used: boolean }) {
  const status = useMedia((s) => s.assets[asset.id]?.status ?? "loading");
  const error = useMedia((s) => s.assets[asset.id]?.error);
  const poster = useMedia((s) => s.assets[asset.id]?.poster);
  const peaks = useMedia((s) => s.assets[asset.id]?.peaks);
  const ready = status === "ready";
  const broken = status === "missing" || status === "error";
  const offline = status === "offline";

  return (
    <div
      draggable={ready}
      title={`${asset.name}${error ? `\n${error}` : ""}${offline ? "\nThe browser needs your permission to read this file again" : ""}\nDouble-click to append to the timeline`}
      onDragStart={(e) => {
        e.dataTransfer.setData(ASSET_MIME, asset.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => ready && addAssetToTimeline(asset.id)}
      onContextMenu={(e) => openMenu(e, assetMenu(asset.id))}
      {...stylex.props(styles.card, stylex.defaultMarker())}
    >
      <div
        {...stylex.props(
          styles.thumb,
          asset.kind === "audio" && styles.audio,
          broken && styles.broken,
        )}
      >
        {poster ? (
          <BitmapCanvas bitmap={poster} />
        ) : peaks ? (
          <AssetWaveform peaks={peaks} />
        ) : status === "loading" ? (
          <Spinner />
        ) : (
          <Icon name={KIND_ICON[asset.kind]} size={22} />
        )}
        {used && <span title="Used in timeline" {...stylex.props(styles.used)} />}
        {asset.duration !== null && (
          <span {...stylex.props(styles.duration)}>{formatDuration(asset.duration)}</span>
        )}
        {asset.frameRate !== undefined && (
          <span {...stylex.props(styles.fps)}>{formatFps(asset.frameRate)} fps</span>
        )}
        {broken && <span {...stylex.props(styles.badge)}>{status}</span>}
        {offline && (
          <button
            type="button"
            title={`Allow Cutline to read ${asset.name} again`}
            onClick={(e) => {
              e.stopPropagation();
              void reconnectMedia([asset.id]).catch(reportError);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            {...stylex.props(styles.badge, styles.reconnect)}
          >
            Reconnect
          </button>
        )}
        <button
          type="button"
          disabled={!ready}
          aria-label={`Add ${asset.name} to timeline`}
          title="Add to timeline"
          onClick={(e) => {
            e.stopPropagation();
            addAssetToTimeline(asset.id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          {...stylex.props(styles.add)}
        >
          <Icon name="plus" size={15} />
        </button>
      </div>
      <button
        type="button"
        title="Remove from project"
        aria-label={`Remove ${asset.name}`}
        onClick={() => deleteAsset(asset.id)}
        {...stylex.props(styles.remove)}
      >
        <Icon name="close" size={12} />
      </button>
      <div {...stylex.props(styles.name)}>{asset.name}</div>
    </div>
  );
}
