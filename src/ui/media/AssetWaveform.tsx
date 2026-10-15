import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const BARS = 40;

const styles = stylex.create({
  wave: { fill: colors.audio },
});

/** Compact peak bars for audio assets without a poster frame. */
export function AssetWaveform({ peaks }: { peaks: Float32Array }) {
  const step = Math.max(1, Math.floor(peaks.length / BARS));
  const values = Array.from({ length: BARS }, (_, i) => peaks[i * step] ?? 0);
  return (
    <svg
      viewBox={`0 0 ${BARS * 3} 30`}
      preserveAspectRatio="none"
      width="80%"
      height="60%"
      aria-hidden
      {...stylex.props(styles.wave)}
    >
      {values.map((v, i) => (
        <rect key={i} x={i * 3} y={15 - v * 14} width={2} height={Math.max(1, v * 28)} />
      ))}
    </svg>
  );
}
