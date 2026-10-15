export interface CubeLut {
  title: string;
  size: number;
  data: Float32Array;
}

const todo = (): never => {
  throw new Error("not implemented");
};

export const parseCubeLut = (_text: string): CubeLut => todo();
export const encodeLut = (_data: Float32Array): string => todo();
export const decodeLut = (_base64: string): Uint8Array => todo();
