/**
 * Exponential Moving Average (EMA) helper for smoothing network statistics
 */
export class EMASmooth {
  private value: number = 0;
  private initialized: boolean = false;

  constructor(private alpha: number = 0.3) {}

  update(newValue: number): number {
    if (!this.initialized) {
      this.value = newValue;
      this.initialized = true;
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.initialized = false;
  }
}

export function createEMASmooth(alpha: number = 0.3): EMASmooth {
  return new EMASmooth(alpha);
}