import { describe, expect, it } from 'vitest';
import { CatchGame, MemoryGame, SequenceGame } from '../src/games';
import { ProgressStore, storageKey } from '../src/progress';
import { letters } from '../src/letters';

describe('matching', () => {
  it('has exactly eight pairs, ignores repeat clicks and locks mismatches', () => {
    const game = new MemoryGame();
    expect(new Set(game.deck).size).toBe(8);
    new Set(game.deck).forEach(symbol => expect(game.deck.filter(item => item === symbol)).toHaveLength(2));
    expect(game.turn(0)).toBe('first');
    expect(game.turn(0)).toBe('ignored');
    expect(game.turn(-1)).toBe('ignored');
    const wrong = game.deck.findIndex(symbol => symbol !== game.deck[0]);
    expect(game.turn(wrong)).toBe('miss');
    expect(game.turn((wrong + 1) % 16)).toBe('ignored');
    expect(game.moves).toBe(1);
    game.closeMismatch();
    expect(game.selected).toHaveLength(0);
    expect(game.busy).toBe(false);
  });
  it('wins only after all pairs, with hints that never match cards automatically', () => {
    const game = new MemoryGame();
    const hint = game.hint();
    expect(game.deck[hint[0]]).toBe(game.deck[hint[1]]);
    expect(game.matched.size).toBe(0);
    new Set(game.deck).forEach(symbol => {
      const pair = game.deck.flatMap((item, index) => item === symbol ? [index] : []);
      game.turn(pair[0]); game.turn(pair[1]);
    });
    expect(game.complete).toBe(true);
    expect(game.moves).toBe(8);
    expect(game.turn(0)).toBe('ignored');
    expect(game.hint()).toEqual([]);
  });
});

describe('light patterns', () => {
  it('ignores input during playback and preserves the round after a mistake', () => {
    const game = new SequenceGame(() => 0.1);
    expect(game.press(0)).toBe('ignored');
    game.startInput();
    expect(game.press(0)).toBe('correct');
    expect(game.press(1)).toBe('miss');
    expect(game.round).toBe(0);
    expect(game.position).toBe(0);
    expect(game.failures).toBe(1);
    game.startInput(); game.press(1);
    expect(game.failures).toBe(2);
  });
  it('requires every 3, 4, 5, and 6-light round, with no double advancement', () => {
    const game = new SequenceGame(() => 0.5);
    for (let round = 0; round < 4; round++) {
      expect(game.length).toBe(round + 3);
      game.startInput();
      for (let i = 0; i < round + 3; i++) game.press(2);
      expect(game.round).toBe(round + 1);
      expect(game.press(2)).toBe('ignored');
    }
    expect(game.complete).toBe(true);
  });
});

const tick = (game: CatchGame, seconds: number) => { for (let i = 0; i < seconds * 20; i++) game.tick(0.05); };
const followHearts = (game: CatchGame, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) {
    const nearest = game.hearts.reduce<(typeof game.hearts)[number] | undefined>((found, heart) => !found || heart.y > found.y ? heart : found, undefined);
    if (nearest) game.move(nearest.x);
    game.tick(0.05);
  }
};
describe('heart shower', () => {
  it('cannot finish before 75 active seconds, even after catching twenty hearts', () => {
    const game = new CatchGame(() => 0.5);
    followHearts(game, 74);
    expect(game.caught).toBeGreaterThanOrEqual(20);
    expect(game.complete).toBe(false);
    followHearts(game, 1.1);
    expect(game.complete).toBe(true);
    const elapsed = game.elapsed;
    tick(game, 10);
    expect(game.elapsed).toBe(elapsed);
  });
  it('stops all simulation during pauses and cannot jump time on a delayed frame', () => {
    const game = new CatchGame();
    tick(game, 2);
    const before = JSON.stringify(game);
    game.paused = true;
    const paused = JSON.stringify(game);
    tick(game, 100); game.move(10);
    expect(JSON.stringify(game)).toBe(paused);
    game.paused = false;
    expect(JSON.stringify(game)).toBe(before);
    const elapsed = game.elapsed;
    game.tick(60);
    expect(game.elapsed - elapsed).toBeCloseTo(0.1);
  });
  it('does not deduct for missed hearts and adds a wider basket after 75 seconds', () => {
    const game = new CatchGame(() => 0.99);
    game.move(0);
    tick(game, 76);
    expect(game.caught).toBeGreaterThanOrEqual(0);
    expect(game.caught).toBeLessThan(20);
    expect(game.complete).toBe(false);
    expect(game.assisted).toBe(true);
    expect(game.basketWidth).toBe(166);
    expect(game.basketX).toBe(83);
    game.move(360);
    followHearts(game, 25);
    expect(game.complete).toBe(true);
    expect(game.caught).toBeGreaterThanOrEqual(20);
  });
  it('spreads hearts across the sky so an untouched central basket does not win', () => {
    const game = new CatchGame(() => 0.5);
    tick(game, 75);
    expect(game.caught).toBeLessThan(20);
    expect(game.complete).toBe(false);
  });
});

function fakeStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function finish(store: ProgressStore) {
  store.start(); store.completeStage(0); store.completeStage(1); store.completeStage(2);
  return store.value.currentLetter!;
}
describe('chapter and letter persistence', () => {
  it('persists checkpoints, rejects skipped chapters, and finishes idempotently', () => {
    const storage = fakeStorage();
    const store = new ProgressStore(storage);
    expect(store.completeStage(2)).toBe(false);
    store.start(); store.completeStage(0);
    const restored = new ProgressStore(storage);
    expect(restored.value.stage).toBe(1);
    restored.completeStage(1); restored.completeStage(2);
    const result = JSON.stringify(restored.value);
    expect(restored.completeStage(2)).toBe(false);
    expect(JSON.stringify(restored.value)).toBe(result);
    expect(new ProgressStore(storage).value).toEqual(restored.value);
  });
  it('draws thirty distinct letters across refreshes and never repeats across cycle boundaries', () => {
    const storage = fakeStorage();
    let store = new ProgressStore(storage, () => 0.5);
    let previous: number | undefined;
    for (let cycle = 0; cycle < 3; cycle++) {
      const seen = new Set<number>();
      for (let run = 0; run < 30; run++) {
        store.replay();
        const current = finish(store);
        expect(current).not.toBe(previous);
        expect(seen.has(current)).toBe(false);
        seen.add(current); previous = current;
        store = new ProgressStore(storage, () => 0.5);
        expect(store.value.currentLetter).toBe(current);
      }
      expect(seen.size).toBe(30);
    }
  });
  it('works without storage and retains its in-session letter history', () => {
    const blocked = { getItem: () => { throw new Error('disabled'); }, setItem: () => { throw new Error('disabled'); } };
    const store = new ProgressStore(blocked);
    const first = finish(store);
    store.replay();
    expect(finish(store)).not.toBe(first);
    expect(store.value.remaining).toHaveLength(28);
  });
  it('recovers from corrupt saves', () => {
    const storage = fakeStorage();
    storage.setItem(storageKey, '{broken');
    expect(new ProgressStore(storage).value.stage).toBe(0);
    storage.setItem(storageKey, JSON.stringify({ stage: 3, started: true, currentLetter: 999, remaining: [], lastLetter: 999 }));
    expect(new ProgressStore(storage).value.started).toBe(false);
  });
});

it('contains thirty distinct personal letters of 60–100 words', () => {
  expect(letters).toHaveLength(30);
  expect(new Set(letters.map(letter => letter.body)).size).toBe(30);
  letters.forEach(letter => {
    const count = letter.body.trim().split(/\s+/).length;
    expect(count, letter.title).toBeGreaterThanOrEqual(60);
    expect(count, letter.title).toBeLessThanOrEqual(100);
    expect(letter.body).toContain('Jayde');
  });
});
