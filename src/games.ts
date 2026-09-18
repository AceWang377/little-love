export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const symbols = ['heart', 'sun', 'moon', 'flower', 'crown', 'star', 'coffee', 'music'] as const;
export type SymbolName = typeof symbols[number];

export class MemoryGame {
  readonly deck: SymbolName[];
  matched = new Set<number>();
  selected: number[] = [];
  moves = 0;
  misses = 0;
  busy = false;
  constructor(random = Math.random) { this.deck = shuffle([...symbols, ...symbols], random); }
  get complete() { return this.matched.size === this.deck.length; }
  turn(index: number): 'ignored' | 'first' | 'match' | 'miss' {
    if (!Number.isInteger(index) || index < 0 || index >= this.deck.length || this.busy || this.complete || this.matched.has(index) || this.selected.includes(index)) return 'ignored';
    this.selected.push(index);
    if (this.selected.length === 1) return 'first';
    this.moves++;
    if (this.deck[this.selected[0]] === this.deck[index]) {
      this.selected.forEach(i => this.matched.add(i));
      this.selected = [];
      this.misses = 0;
      return 'match';
    }
    this.busy = true;
    this.misses++;
    return 'miss';
  }
  closeMismatch() { this.selected = []; this.busy = false; }
  hint(): number[] {
    const first = this.deck.findIndex((_, i) => !this.matched.has(i));
    return first < 0 ? [] : this.deck.flatMap((value, i) => value === this.deck[first] ? [i] : []);
  }
}

export class SequenceGame {
  round = 0;
  failures = 0;
  position = 0;
  accepting = false;
  readonly pattern: number[];
  constructor(random = Math.random) { this.pattern = Array.from({ length: 6 }, () => Math.floor(random() * 4)); }
  get length() { return this.round + 3; }
  get complete() { return this.round === 4; }
  startInput() { if (!this.complete) { this.position = 0; this.accepting = true; } }
  press(pad: number): 'ignored' | 'correct' | 'round' | 'miss' {
    if (!this.accepting || !Number.isInteger(pad) || pad < 0 || pad > 3) return 'ignored';
    if (pad !== this.pattern[this.position]) {
      this.failures++; this.accepting = false; this.position = 0;
      return 'miss';
    }
    this.position++;
    if (this.position < this.length) return 'correct';
    this.round++; this.position = 0; this.failures = 0; this.accepting = false;
    return 'round';
  }
}

export interface FallingHeart { id: number; x: number; y: number; speed: number; }
export class CatchGame {
  static readonly duration = 75;
  static readonly target = 20;
  elapsed = 0;
  caught = 0;
  basketX = 180;
  hearts: FallingHeart[] = [];
  paused = false;
  private nextSpawn = 0.3;
  private nextId = 0;
  private lanes: number[] = [];
  constructor(private random = Math.random) {}
  get assisted() { return this.elapsed >= CatchGame.duration; }
  get basketWidth() { return this.assisted ? 166 : 98; }
  get complete() { return this.elapsed >= CatchGame.duration && this.caught >= CatchGame.target; }
  move(x: number) {
    if (!this.paused && !this.complete && Number.isFinite(x)) this.basketX = Math.max(this.basketWidth / 2, Math.min(360 - this.basketWidth / 2, x));
  }
  tick(deltaSeconds: number) {
    if (this.paused || this.complete) return;
    const dt = Math.max(0, Math.min(deltaSeconds, 0.1));
    this.elapsed += dt;
    this.basketX = Math.max(this.basketWidth / 2, Math.min(360 - this.basketWidth / 2, this.basketX));
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      const progress = Math.min(1, this.elapsed / CatchGame.duration);
      if (this.lanes.length === 0) this.lanes = shuffle([32, 106, 180, 254, 328], this.random);
      const x = this.lanes.pop()! + (this.random() - 0.5) * 16;
      this.hearts.push({ id: this.nextId++, x, y: -18, speed: this.assisted ? 100 : 90 + progress * 65 });
      this.nextSpawn = this.assisted ? 0.8 : 1.25 - progress * 0.25;
    }
    this.hearts = this.hearts.filter(heart => {
      const before = heart.y;
      heart.y += heart.speed * dt;
      if (before < 352 && heart.y >= 352 && Math.abs(heart.x - this.basketX) <= this.basketWidth / 2 + 9) {
        this.caught++; return false;
      }
      return heart.y < 425;
    });
  }
}
