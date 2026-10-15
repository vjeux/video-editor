import { PHONE_QUERY, useMediaQuery } from "../shell/use-media-query";
import * as stylex from "@stylexjs/stylex";
import { MAX_PX_PER_SECOND, MIN_PX_PER_SECOND, zoomBy, zoomToFit } from "../../app/commands";
import { useEditor } from "../../store";
import { Icon } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import { Range } from "../controls/Range";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  zoom: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    color: colors.faint,
  },
  range: { width: 110, display: "grid" },
  /** The slider (with its icons) on larger screens… */
  slider: { display: { default: "contents", "@media (max-width: 599px)": "none" } },
  /** …and compact step buttons on phones. */
  steps: { display: { default: "none", "@media (max-width: 599px)": "contents" } },
});

/** Zoom-to-fit plus a log-scale zoom slider; `width` is the visible lanes width to fit into. */
export function ZoomControl({ width }: { width: number }) {
  const phone = useMediaQuery(PHONE_QUERY);
  const pps = useEditor((s) => s.pxPerSecond);
  const setView = useEditor((s) => s.setView);
  return (
    <div {...stylex.props(styles.zoom)}>
      <IconButton
        small={phone}
        icon="fit"
        title="Zoom to fit"
        onClick={() => zoomToFit(width)}
        size={14}
      />
      <span {...stylex.props(styles.slider)}>
        <Icon name="zoomOut" size={14} />
        <div {...stylex.props(styles.range)}>
          <Range
            label="Zoom"
            value={Math.log(pps)}
            min={Math.log(MIN_PX_PER_SECOND)}
            max={Math.log(MAX_PX_PER_SECOND)}
            onChange={(v) => setView({ pxPerSecond: Math.exp(v) })}
          />
        </div>
        <Icon name="zoomIn" size={14} />
      </span>
      <span {...stylex.props(styles.steps)}>
        <IconButton
          small={phone}
          icon="zoomOut"
          title="Zoom out (−)"
          size={14}
          onClick={() => zoomBy(0.8)}
        />
        <IconButton
          small={phone}
          icon="zoomIn"
          title="Zoom in (+)"
          size={14}
          onClick={() => zoomBy(1.25)}
        />
      </span>
    </div>
  );
}
