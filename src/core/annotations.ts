export interface Annotation {
  time: number;
  label: string;
}

export function parseTime(_text: string): number | null {
  throw new Error("not implemented");
}

export function parseAnnotations(_text: string): Annotation[] {
  throw new Error("not implemented");
}
