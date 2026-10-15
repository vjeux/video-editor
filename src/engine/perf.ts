export class RollingStats {
  constructor(_capacity: number) {}
  get count(): number {
    throw new Error("Not implemented");
  }
  push(_value: number): void {
    throw new Error("Not implemented");
  }
  percentile(_q: number): number {
    throw new Error("Not implemented");
  }
  max(): number {
    throw new Error("Not implemented");
  }
  clear(): void {
    throw new Error("Not implemented");
  }
}
