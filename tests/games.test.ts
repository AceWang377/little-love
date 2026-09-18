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
  it('cannot finish before 25 active seconds, even after catching eight hearts', () => {
    const game = new CatchGame(() => 0.5);
    followHearts(game, 24);
    expect(game.caught).toBeGreaterThanOrEqual(8);
    expect(game.complete).toBe(false);
    followHearts(game, 1.1);
    expect(game.complete).toBe(true);
    expect(game.elapsed).toBeGreaterThanOrEqual(25);
    expect(game.elapsed).toBeLessThan(25.1);
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
  it('does not deduct for missed hearts and adds a wider basket after 25 seconds', () => {
    const game = new CatchGame(() => 0.99);
    game.caught = 1;
    game.hearts = [{ id: 100, x: 0, y: 351, speed: 100 }];
    game.tick(0.05);
    expect(game.caught).toBe(1);
    game.move(0);
    tick(game, 25);
    expect(game.caught).toBeLessThan(8);
    expect(game.complete).toBe(false);
    expect(game.assisted).toBe(true);
    expect(game.basketWidth).toBe(166);
    expect(game.basketX).toBe(83);
  });
  it('finishes immediately when the eighth heart is caught during extra time', () => {
    const game = new CatchGame();
    game.elapsed = 26;
    game.caught = 7;
    game.hearts = [{ id: 100, x: 180, y: 351, speed: 100 }];
    expect(game.complete).toBe(false);
    game.tick(0.05);
    expect(game.complete).toBe(true);
    expect(game.caught).toBe(8);
    expect(game.elapsed).toBeCloseTo(26.05);
  });
  it('gives an idle player help at 25 seconds and finishes by 30 regardless of score', () => {
    const game = new CatchGame(() => 0.5);
    tick(game, 25.1);
    expect(game.caught).toBeLessThan(8);
    expect(game.complete).toBe(false);
    expect(game.assisted).toBe(true);
    tick(game, 5);
    expect(game.complete).toBe(true);
    expect(game.caught).toBeLessThan(8);
    expect(game.elapsed).toBe(30);
    const finished = JSON.stringify(game);
    tick(game, 10); game.move(0);
    expect(JSON.stringify(game)).toBe(finished);
  });
  it('freezes the five-second assistance window while paused', () => {
    const game = new CatchGame();
    game.elapsed = 27;
    game.paused = true;
    const paused = JSON.stringify(game);
    tick(game, 30); game.move(0);
    expect(JSON.stringify(game)).toBe(paused);
    game.paused = false;
    tick(game, 3.1);
    expect(game.elapsed).toBe(30);
    expect(game.complete).toBe(true);
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
  it('draws sixty distinct letters across refreshes and never repeats across cycle boundaries', () => {
    const storage = fakeStorage();
    let store = new ProgressStore(storage, () => 0.5);
    let previous: number | undefined;
    for (let cycle = 0; cycle < 3; cycle++) {
      const seen = new Set<number>();
      for (let run = 0; run < 60; run++) {
        store.replay();
        const current = finish(store);
        expect(current).not.toBe(previous);
        expect(seen.has(current)).toBe(false);
        seen.add(current); previous = current;
        store = new ProgressStore(storage, () => 0.5);
        expect(store.value.currentLetter).toBe(current);
      }
      expect(seen.size).toBe(60);
    }
  });
  it('works without storage and retains its in-session letter history', () => {
    const blocked = { getItem: () => { throw new Error('disabled'); }, setItem: () => { throw new Error('disabled'); } };
    const store = new ProgressStore(blocked);
    const seen = new Set<number>();
    for (let run = 0; run < 60; run++) {
      store.replay();
      const id = finish(store);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(60);
    expect(store.value.remaining).toHaveLength(0);
  });
  it('swaps the next draw when reshuffling would immediately repeat the last note', () => {
    const storage = fakeStorage();
    storage.setItem(storageKey, JSON.stringify({ catalogSize: 60, stage: 3, started: true, currentLetter: 30, remaining: [], lastLetter: 30 }));
    const store = new ProgressStore(storage, () => 0.5);
    store.replay();
    expect(finish(store)).not.toBe(30);
    expect(store.value.remaining).toContain(30);
    expect(new Set([...store.value.remaining, store.value.currentLetter]).size).toBe(60);
  });
  it.each([0, 1, 2, 3])('upgrades a partially read old deck once, preserving chapter %i and the current letter', stage => {
    const storage = fakeStorage();
    const old = { stage, started: true, currentLetter: stage === 3 ? 5 : null, remaining: Array.from({ length: 24 }, (_, i) => i + 6), lastLetter: 5 };
    storage.setItem(storageKey, JSON.stringify(old));
    let store = new ProgressStore(storage, () => 0.5);
    expect(store.value).toMatchObject({ stage, started: true, currentLetter: old.currentLetter, lastLetter: 5, catalogSize: 60 });
    expect(new Set(store.value.remaining)).toEqual(new Set(Array.from({ length: 54 }, (_, i) => i + 6)));
    expect(new ProgressStore(storage).value).toEqual(store.value);
    const seen = new Set([0, 1, 2, 3, 4, 5]);
    for (let run = 0; run < 54; run++) {
      store.replay();
      const id = finish(store);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      store = new ProgressStore(storage);
    }
    expect(seen.size).toBe(60);
    expect(store.value.remaining).toHaveLength(0);
  });
  it('adds only the new thirty notes to an exhausted old deck before starting a new sixty-note cycle', () => {
    const storage = fakeStorage();
    storage.setItem(storageKey, JSON.stringify({ stage: 3, started: true, currentLetter: 29, remaining: [], lastLetter: 29 }));
    const store = new ProgressStore(storage, () => 0.5);
    expect(store.value.currentLetter).toBe(29);
    expect(store.value.remaining).toHaveLength(30);
    const seen = new Set<number>();
    for (let run = 0; run < 30; run++) {
      store.replay();
      const id = finish(store);
      expect(id).toBeGreaterThanOrEqual(30);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    const previous = store.value.currentLetter;
    store.replay();
    expect(finish(store)).not.toBe(previous);
    expect(store.value.remaining).toHaveLength(59);
  });
  it('gives an old save that has never drawn a letter the full sixty-note deck', () => {
    const storage = fakeStorage();
    storage.setItem(storageKey, JSON.stringify({ stage: 2, started: true, currentLetter: null, remaining: [], lastLetter: null }));
    const store = new ProgressStore(storage, () => 0.5);
    expect(store.value.stage).toBe(2);
    expect(store.value.remaining).toHaveLength(0);
    expect(store.value.catalogSize).toBe(60);
    store.completeStage(2);
    expect(new Set([...store.value.remaining, store.value.currentLetter]).size).toBe(60);
  });
  it('recovers from corrupt saves', () => {
    const storage = fakeStorage();
    storage.setItem(storageKey, '{broken');
    expect(new ProgressStore(storage).value.stage).toBe(0);
    storage.setItem(storageKey, JSON.stringify({ stage: 3, started: true, currentLetter: 999, remaining: [], lastLetter: 999 }));
    expect(new ProgressStore(storage).value.started).toBe(false);
  });
});

it('contains sixty distinct personal letters of 60–100 words', () => {
  expect(letters).toHaveLength(60);
  expect(new Set(letters.map(letter => letter.title)).size).toBe(60);
  expect(new Set(letters.map(letter => letter.body)).size).toBe(60);
  letters.forEach(letter => {
    const count = letter.body.trim().split(/\s+/).length;
    expect(count, letter.title).toBeGreaterThanOrEqual(60);
    expect(count, letter.title).toBeLessThanOrEqual(100);
    expect(letter.body).toContain('Jayde');
  });
});
