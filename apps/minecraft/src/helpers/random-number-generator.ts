// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// https://en.wikipedia.org/wiki/Multiply-with-carry_pseudorandom_number_generator

// Multiply-with-carry pseudorandom number generator
export class RandomNumberGenerator {
  private m_w: number;
  private m_z: number;
  private readonly mask: number = 0xffffffff;

  constructor(seedValue?: number) {
    this.m_w = 123456789;
    this.m_z = 987654321;

    if (seedValue !== undefined) {
      this.seed(seedValue);
    }
  }

  // Takes any integer
  seed(i: number): void {
    this.m_w = (123456789 + i) & this.mask;
    this.m_z = (987654321 - i) & this.mask;
  }

  // Returns number between 0 (inclusive) and 1.0 (exclusive),
  // just like Math.random().
  random(): number {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & this.mask;
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & this.mask;
    const result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
    return result / 4294967296;
  }
}
