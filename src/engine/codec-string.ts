/** H.264 levels (level_idc) with their max macroblocks per second and per frame. */
const AVC_LEVELS: readonly (readonly [idc: number, maxMbps: number, maxFs: number])[] = [
  [30, 40_500, 1_620],
  [31, 108_000, 3_600],
  [32, 216_000, 5_120],
  [40, 245_760, 8_192],
  [42, 522_240, 8_704],
  [50, 589_824, 22_080],
  [51, 983_040, 36_864],
  [52, 2_073_600, 36_864],
  [60, 4_177_920, 139_264],
  [61, 8_355_840, 139_264],
  [62, 16_711_680, 139_264],
];

const HIGH_PROFILE = "6400";

/**
 * The High profile codec string whose level covers both the frame size and
 * the macroblock rate (size × fps): 1080p60 needs 4.2, which a level chosen
 * from frame size alone (4.0) does not allow.
 */
export function avcCodecString(width: number, height: number, fps: number): string {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const rate = macroblocks * fps;
  const level =
    AVC_LEVELS.find(([, maxMbps, maxFs]) => macroblocks <= maxFs && rate <= maxMbps) ??
    AVC_LEVELS[AVC_LEVELS.length - 1];
  const idc = level?.[0] ?? 62;
  return `avc1.${HIGH_PROFILE}${idc.toString(16).padStart(2, "0")}`;
}
