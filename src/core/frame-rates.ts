export interface FrameRate {
  value: number;
  label: string;
}

export const FRAME_RATES: readonly FrameRate[] = [];

export function suggestProjectFps(_measured: number | null): number | null {
  throw new Error("Not implemented");
}
