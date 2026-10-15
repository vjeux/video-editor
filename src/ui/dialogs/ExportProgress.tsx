import * as stylex from "@stylexjs/stylex";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  wrap: { display: "grid", gap: 16, paddingBlock: 20 },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  percent: { color: colors.accent2, fontFamily: fonts.mono, fontSize: 28, letterSpacing: "-1px" },
  track: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.line },
  bar: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent,
    transition: "width 150ms ease",
  },
  width: (width: string) => ({ width }),
  hint: { margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.7 },
  status: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
});

/** Encoding progress with a distinct finalization stage and a readable ETA. */
export function ExportProgress({ progress, eta }: { progress: number; eta: number | null }) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const finishing = progress >= 1;
  const remaining =
    eta === null
      ? "Estimating time…"
      : eta < 60
        ? "Less than a minute left"
        : `About ${Math.ceil(eta / 60)} min left`;
  return (
    <div {...stylex.props(styles.wrap)}>
      <div {...stylex.props(styles.heading)}>
        <h3 role="status" {...stylex.props(styles.title)}>
          {finishing ? "Finishing up…" : "Creating your video"}
        </h3>
        <span aria-hidden {...stylex.props(styles.percent)}>
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Export progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        {...stylex.props(styles.track)}
      >
        <div {...stylex.props(styles.bar, styles.width(`${percent}%`))} />
      </div>
      <div {...stylex.props(styles.status, styles.hint)}>
        <span>{finishing ? "Preparing your file for download." : "Rendering your timeline."}</span>
        {!finishing && <span>{remaining}</span>}
      </div>
      <p {...stylex.props(styles.hint)}>
        You can hide this window and keep editing. Keep this tab open until the export finishes.
      </p>
    </div>
  );
}
