export interface RandomState {
  readonly s: readonly [number, number, number, number];
}

export type RandomSeed = number | string;

const UINT32_RANGE = 4294967296;

function cyrb128(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function seedWords(seed: RandomSeed): [number, number, number, number] {
  return typeof seed === 'number' ? cyrb128(`n:${seed}`) : cyrb128(`s:${seed}`);
}

/**
 * Deterministic seeded pseudo-random generator (sfc32). All gameplay randomness must flow
 * through this class so a match or career can be replayed exactly from its seed.
 */
export class Random {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: RandomSeed = 0) {
    const [a, b, c, d] = seedWords(seed);
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.warmUp();
  }

  static fromWords(words: readonly [number, number, number, number]): Random {
    const random = Object.create(Random.prototype) as Random;
    random.a = words[0] >>> 0;
    random.b = words[1] >>> 0;
    random.c = words[2] >>> 0;
    random.d = words[3] >>> 0;
    return random;
  }

  private warmUp(): void {
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Float in [0, 1). */
  next(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / UINT32_RANGE;
  }

  /** Integer in the inclusive range [min, max]. */
  int(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new RangeError(`invalid range [${min}, ${max}]`);
    }
    const span = max - min + 1;
    return min + Math.floor(this.next() * span);
  }

  /** True with probability p (clamped to [0, 1]). */
  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('cannot pick from an empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  weighted<T>(entries: readonly { value: T; weight: number }[]): T {
    let total = 0;
    for (const entry of entries) {
      if (entry.weight < 0 || !Number.isFinite(entry.weight)) {
        throw new RangeError(`invalid weight ${entry.weight}`);
      }
      total += entry.weight;
    }
    if (total <= 0) throw new RangeError('weights must sum to a positive number');
    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry.value;
    }
    return (entries[entries.length - 1] as { value: T }).value;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = result[i] as T;
      result[i] = result[j] as T;
      result[j] = tmp;
    }
    return result;
  }

  /** Derive an independent stream deterministically from this stream's current state. */
  fork(label: string): Random {
    const [a, b, c, d] = this.stateWords();
    return Random.fromWords(cyrb128(`${label}|${a}|${b}|${c}|${d}`));
  }

  getState(): RandomState {
    return { s: this.stateWords() };
  }

  setState(state: RandomState): void {
    const [a, b, c, d] = state.s;
    this.a = a >>> 0;
    this.b = b >>> 0;
    this.c = c >>> 0;
    this.d = d >>> 0;
  }

  private stateWords(): [number, number, number, number] {
    return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
  }
}
