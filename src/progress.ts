import { letters } from './letters';
import { shuffle } from './games';

export const storageKey = 'little-love-v1';
export interface Progress {
  stage: number;
  started: boolean;
  currentLetter: number | null;
  remaining: number[];
  lastLetter: number | null;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const fresh = (): Progress => ({ stage: 0, started: false, currentLetter: null, remaining: [], lastLetter: null });
const validLetter = (id: unknown): id is number => Number.isInteger(id) && Number(id) >= 0 && Number(id) < letters.length;

export class ProgressStore {
  value: Progress = fresh();
  constructor(private storage?: StorageLike, private random = Math.random) {
    try {
      const parsed = JSON.parse(storage?.getItem(storageKey) || 'null');
      if (parsed && Number.isInteger(parsed.stage) && parsed.stage >= 0 && parsed.stage <= 3 && typeof parsed.started === 'boolean'
        && Array.isArray(parsed.remaining) && parsed.remaining.every(validLetter) && new Set(parsed.remaining).size === parsed.remaining.length
        && (parsed.currentLetter === null || validLetter(parsed.currentLetter)) && (parsed.lastLetter === null || validLetter(parsed.lastLetter))
        && (parsed.stage !== 3 || validLetter(parsed.currentLetter))) this.value = parsed;
    } catch { /* Keep a usable in-memory session when storage is unavailable. */ }
  }
  private save() { try { this.storage?.setItem(storageKey, JSON.stringify(this.value)); } catch { /* In-memory progress stays intact. */ } }
  start() { this.value.started = true; this.save(); }
  completeStage(stage: number) {
    if (!this.value.started || stage !== this.value.stage || stage > 2) return false;
    this.value.stage++;
    if (this.value.stage === 3) this.drawLetter();
    this.save();
    return true;
  }
  private drawLetter() {
    if (this.value.remaining.length === 0) {
      this.value.remaining = shuffle(letters.map((_, i) => i), this.random);
      const last = this.value.remaining.length - 1;
      if (this.value.remaining[last] === this.value.lastLetter) {
        [this.value.remaining[0], this.value.remaining[last]] = [this.value.remaining[last], this.value.remaining[0]];
      }
    }
    const id = this.value.remaining.pop()!;
    this.value.currentLetter = id;
    this.value.lastLetter = id;
  }
  replay() {
    this.value.stage = 0; this.value.currentLetter = null; this.value.started = true;
    this.save();
  }
}
