import './style.css';
import { CatchGame, MemoryGame, SequenceGame, type SymbolName } from './games';
import { ProgressStore } from './progress';
import { letters } from './letters';
import { icon } from './icons';

const app = document.querySelector<HTMLElement>('#app')!;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Private browsers can still play. */ }
const progress = new ProgressStore(storage);
let generation = 0;
let destroyCanvas: (() => void) | undefined;
let paused = false;
let confettiTimer: ReturnType<typeof setTimeout> | undefined;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const names: Record<SymbolName, string> = { heart: 'Love', sun: 'Sunshine', moon: 'Moonlight', flower: 'Bloom', crown: 'Princess', star: 'Starlight', coffee: 'Coffee', music: 'Melody' };

function delay(ms: number): Promise<boolean> {
  const current = generation;
  let remaining = ms, previous = performance.now();
  return new Promise(resolve => {
    const timer = setInterval(() => {
      if (generation !== current) { clearInterval(timer); resolve(false); return; }
      const now = performance.now();
      if (!paused && !document.hidden) remaining -= Math.min(now - previous, 100);
      previous = now;
      if (remaining <= 0) { clearInterval(timer); resolve(true); }
    }, 30);
  });
}

function clearScreen() {
  generation++; paused = false; destroyCanvas?.(); destroyCanvas = undefined;
}
function focusTitle() { $('title')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function steps(current: number) {
  return `<ol class="steps" aria-label="Your adventure">${['A little love', 'A little magic', 'All my heart'].map((name, i) => `<li class="${i < current ? 'done' : i === current ? 'current' : ''}" ${i === current ? 'aria-current="step"' : ''}><span class="step-number">${i < current ? '✓' : `0${i + 1}`}</span><span>${name}</span></li>`).join('')}</ol>`;
}
function header(chapter: number, title: string, subtitle: string) {
  return `${steps(chapter)}<p class="eyebrow">CHAPTER 0${chapter + 1} OF 03</p><h1 id="title" tabindex="-1">${title}</h1><p class="instructions">${subtitle}</p>`;
}
function playArea(content: string) {
  return `<div class="play-wrap" data-paused="false"><div id="play-area">${content}</div><div class="pause-overlay" hidden><span class="pause-heart">♡</span><p>A little breather, Princess.</p><button class="button primary" id="resume">Keep playing</button></div></div>`;
}
function controls() {
  return `<div class="game-actions"><button id="pause" class="text-button">Pause</button><span aria-hidden="true">·</span><button id="retry" class="text-button">Try this chapter again</button></div>`;
}
function setPaused(value: boolean) {
  paused = value;
  const wrap = app.querySelector<HTMLElement>('.play-wrap');
  if (!wrap) return;
  wrap.dataset.paused = String(value);
  $('play-area').inert = value;
  wrap.querySelector<HTMLElement>('.pause-overlay')!.hidden = !value;
  $('pause').textContent = value ? 'Resume' : 'Pause';
  if (value && !document.hidden) $('resume').focus({ preventScroll: true });
}
function bindControls() {
  $('pause').onclick = () => setPaused(!paused);
  $('resume').onclick = () => { setPaused(false); $('pause').focus({ preventScroll: true }); };
  $('retry').onclick = render;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && $('play-area')) setPaused(true); });

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  clearTimeout(confettiTimer);
  const confetti = $('confetti');
  confetti.replaceChildren();
  for (let i = 0; i < 24; i++) {
    const heart = document.createElement('i');
    heart.textContent = i % 3 ? '♡' : '♥';
    heart.style.cssText = `--x:${Math.random() * 100}%;--drift:${Math.random() * 120 - 60}px;--delay:${Math.random() * 0.6}s;--size:${14 + Math.random() * 16}px`;
    confetti.append(heart);
  }
  confettiTimer = setTimeout(() => confetti.replaceChildren(), 4300);
}

function welcome() {
  app.innerHTML = `<section class="screen welcome"><div class="royal-seal">${icon('crown')}</div><p class="eyebrow">A SMALL WORLD, MADE FOR YOU</p><h1 id="title" tabindex="-1">A little adventure<br>for <em>Princess Jayde.</em></h1><p class="welcome-copy">Three little chapters. A sprinkle of magic.<br>And something from my heart, waiting at the end.</p><button class="button primary" id="begin">Let’s find your surprise <span aria-hidden="true">→</span></button><p class="small-note">About 3–5 minutes · Just you, at your own pace</p><div class="welcome-trail" aria-hidden="true">${icon('heart')}<span>········</span>${icon('star')}<span>········</span>${icon('crown')}</div><p class="handwritten">A new little note, every time you finish. ♡</p></section>`;
  $('begin').onclick = () => { progress.start(); render(); };
}

function chapterDone(stage: number) {
  if (!progress.completeStage(stage)) return;
  clearScreen();
  const messages = [
    ['Every little pair,<br><em>a little closer.</em>', 'You make ordinary days feel special, Princess.'],
    ['A little magic.<br><em>Just like you.</em>', 'Jayde, you’re my favourite kind of bright.'],
    ['All those hearts,<br><em>all for you.</em>', 'Your little surprise is ready, Princess Jayde.'],
  ];
  const [title, text] = messages[stage];
  app.innerHTML = `<section class="screen chapter-complete">${steps(stage + 1)}<div class="royal-seal">${icon(stage === 2 ? 'crown' : 'heart')}</div><p class="eyebrow">A LITTLE CHAPTER, COMPLETE</p><h1 id="title" tabindex="-1">${title}</h1><p class="instructions">${text}</p><button class="button primary" id="continue">${stage === 2 ? 'Open your little note' : 'On to the next little chapter'} <span aria-hidden="true">→</span></button></section>`;
  $('continue').onclick = render;
  focusTitle(); celebrate();
}

function memory() {
  const model = new MemoryGame();
  let hinting: number[] = [];
  app.innerHTML = `<section class="screen">${header(0, 'Little things,<br><em>lovely together.</em>', 'Find the 8 matching pairs. A little patience, a little love.')}<div class="progress-row"><span id="pairs" aria-live="polite">0 of 8 pairs</span><span id="moves">0 turns</span></div>${playArea(`<div class="board" role="group" aria-label="Find eight matching pairs">${model.deck.map((_, i) => `<button class="card" aria-label="Turn over card ${i + 1}" aria-pressed="false" data-card="${i}"><span class="card-inner" aria-hidden="true"><span class="card-face card-back">${icon('heart')}</span><span class="card-face card-front"></span></span></button>`).join('')}</div>`)}<p id="status" class="status" role="status">Take your time, Princess. There’s no rush.</p><button class="text-button" id="hint" hidden>A tiny hint?</button>${controls()}</section>`;
  const buttons = [...app.querySelectorAll<HTMLButtonElement>('[data-card]')];
  function update() {
    buttons.forEach((button, i) => {
      const matched = model.matched.has(i), visible = matched || model.selected.includes(i) || hinting.includes(i);
      button.classList.toggle('flipped', visible);
      button.classList.toggle('matched', matched);
      button.disabled = matched || hinting.length > 0;
      button.setAttribute('aria-pressed', String(visible));
      button.setAttribute('aria-label', `${matched ? 'Matched ' : ''}${visible ? names[model.deck[i]] : 'Turn over'} card ${i + 1}`);
      const face = button.querySelector('.card-front')!;
      face.innerHTML = visible ? `${icon(model.deck[i])}<span class="card-name">${names[model.deck[i]]}</span>` : '';
    });
    $('pairs').textContent = `${model.matched.size / 2} of 8 pairs`;
    $('moves').textContent = `${model.moves} ${model.moves === 1 ? 'turn' : 'turns'}`;
    $('hint').hidden = model.misses < 4 || model.complete;
  }
  buttons.forEach((button, i) => {
    button.onclick = async () => {
      if (paused || hinting.length) return;
      const result = model.turn(i);
      if (result === 'ignored') return;
      update();
      if (result === 'miss') {
        $('status').textContent = 'Almost, Princess. Another little try?';
        if (!await delay(1050)) return;
        model.closeMismatch(); update();
      } else if (result === 'match') {
        $('status').textContent = model.complete ? 'All paired up. Lovely work, Jayde.' : ['A little love, found.', 'You make a lovely pair.', 'One more little reason to smile.'][model.matched.size / 2 % 3];
        if (model.complete) { if (await delay(850)) chapterDone(0); }
        else buttons.find((_, index) => !model.matched.has(index))?.focus({ preventScroll: true });
      } else $('status').textContent = 'Now find its little match.';
    };
  });
  $('hint').onclick = async () => {
    if (paused || model.busy || hinting.length) return;
    hinting = model.hint(); model.busy = true; update();
    $('status').textContent = 'These two belong together. A little help from me. ♡';
    if (!await delay(1600)) return;
    hinting = []; model.busy = false; update();
  };
  bindControls();
}

function sequence() {
  const model = new SequenceGame();
  const padNames = ['Heart', 'Star', 'Moon', 'Flower'];
  const padIcons = ['heart', 'star', 'moon', 'flower'];
  let animationBusy = false;
  app.innerHTML = `<section class="screen">${header(1, 'Follow a little<br><em>trail of starlight.</em>', 'Watch the lights, then tap them in the same order.')}<div class="progress-row"><span id="round" aria-live="polite">Round 1 of 4</span><span id="sequence-length">3 little lights</span></div>${playArea(`<div class="pads" role="group" aria-label="Repeat the light sequence">${padNames.map((name, i) => `<button class="pad pad-${i}" data-pad="${i}" aria-label="${name}" disabled>${icon(padIcons[i])}<span>${name}</span><small>${i + 1}</small></button>`).join('')}</div>`)}<p id="status" class="status" role="status">A little memory magic, Princess.</p><button class="button primary" id="watch">Show me the lights</button><button class="text-button" id="repeat" hidden>Show that pattern again</button>${controls()}</section>`;
  const pads = [...app.querySelectorAll<HTMLButtonElement>('[data-pad]')];
  async function show() {
    if (animationBusy || model.complete || paused) return;
    animationBusy = true; model.accepting = false;
    pads.forEach(pad => pad.disabled = true);
    $('watch').hidden = true; $('repeat').hidden = true;
    $('status').textContent = model.failures >= 2 ? 'A little slower this time. We’ve got this, Princess.' : 'Watch closely, Jayde…';
    if (!await delay(650)) return;
    for (let i = 0; i < model.length; i++) {
      const pad = pads[model.pattern[i]];
      pad.classList.add('lit');
      if (!await delay(model.failures >= 2 ? 1000 : 740)) return;
      pad.classList.remove('lit');
      if (!await delay(330)) return;
    }
    animationBusy = false; model.startInput();
    pads.forEach(pad => pad.disabled = false);
    $('status').textContent = `Your turn, Princess. ${model.length} lights to remember.`;
    $('repeat').hidden = false;
    pads[0].focus({ preventScroll: true });
  }
  pads.forEach((pad, i) => pad.onclick = async () => {
    if (paused || animationBusy) return;
    const result = model.press(i);
    if (result === 'ignored') return;
    pad.classList.add('pressed');
    const current = generation;
    setTimeout(() => { if (generation === current) pad.classList.remove('pressed'); }, 180);
    if (result === 'miss') {
      pads.forEach(item => item.disabled = true);
      $('repeat').hidden = true;
      $('status').textContent = 'Nearly! We’ll try just this pattern again. ♡';
      if (await delay(1100)) void show();
    } else if (result === 'round') {
      pads.forEach(item => item.disabled = true);
      $('repeat').hidden = true;
      $('status').textContent = 'That’s it, Princess. Beautifully remembered.';
      if (!await delay(1200)) return;
      if (model.complete) chapterDone(1);
      else {
        $('round').textContent = `Round ${model.round + 1} of 4`;
        $('sequence-length').textContent = `${model.length} little lights`;
        void show();
      }
    } else $('status').textContent = `${model.position} of ${model.length} — you’ve got this.`;
  });
  $('watch').onclick = () => void show();
  $('repeat').onclick = () => void show();
  bindControls();
}

async function catcher() {
  const model = new CatchGame();
  const current = generation;
  app.innerHTML = `<section class="screen catch-screen">${header(2, 'A sky full of love,<br><em>all for you.</em>', 'Move your basket to catch 20 hearts. Enjoy the whole little shower.')}<div class="progress-row"><span id="caught">0 of 20 hearts</span><span id="time">75 seconds of sweetness</span></div>${playArea('<div id="catch-field" role="img" aria-label="Pink hearts falling towards your basket"></div><label class="sr-only" for="basket">Basket position. Use left and right arrows to move.</label><input id="basket" class="basket-slider" type="range" min="0" max="360" value="180" aria-label="Basket position" /><div class="catch-start" id="catch-start"><span aria-hidden="true">♡</span><p>A little shower of affection.</p><button id="catch-begin" class="button primary" disabled>Gathering your hearts…</button><small>Drag the basket, tap the sky, or use ← →</small></div>')}<p id="status" class="status" role="status">No hearts lost. Just lovely ones to catch.</p>${controls()}</section>`;
  bindControls();
  try {
    const { mountCatcher } = await import('./catcher');
    if (current !== generation) return;
    $('catch-begin').textContent = 'Let the hearts fall';
    ($('catch-begin') as HTMLButtonElement).disabled = false;
    $('catch-begin').onclick = () => {
      if (paused) return;
      ($('catch-begin') as HTMLButtonElement).disabled = true;
      $('catch-start').hidden = true;
      const slider = $<HTMLInputElement>('basket');
      slider.oninput = () => model.move(Number(slider.value));
      slider.focus({ preventScroll: true });
      let assisted = false;
      destroyCanvas = mountCatcher($('catch-field'), model, () => {
        $('caught').textContent = `${model.caught} of 20 hearts`;
        $('time').textContent = model.assisted ? 'A little extra love' : `${Math.max(0, Math.ceil(75 - model.elapsed))} seconds of sweetness`;
        slider.value = String(Math.round(model.basketX));
        if (model.assisted && !assisted) { assisted = true; $('status').textContent = 'A bigger basket, a little more time. Keep going, Princess. ♡'; }
      }, () => { if (current === generation) chapterDone(2); });
    };
  } catch {
    if (current !== generation) return;
    $('catch-begin').textContent = 'Try loading again';
    ($('catch-begin') as HTMLButtonElement).disabled = false;
    $('catch-begin').onclick = render;
    $('status').textContent = 'The hearts need another moment to load. Your earlier chapters are saved.';
  }
}

function letter() {
  const note = letters[progress.value.currentLetter!];
  app.innerHTML = `<section class="screen letter-screen"><p class="eyebrow">A LITTLE NOTE, ONLY FOR YOU</p><img class="envelope" src="${import.meta.env.BASE_URL}love-letter.png" width="148" height="148" alt="A paper envelope filled with little hearts" /><h1 id="title" tabindex="-1">${note.title} <span class="tiny-heart" aria-hidden="true">♡</span></h1><article class="letter" aria-label="A love letter from Ace"><p class="salutation">My Princess Jayde,</p>${note.body.split('\n\n').map(p => `<p>${p}</p>`).join('')}<p class="signature">Yours,<br><em>Ace</em> <span aria-hidden="true">♡</span></p></article><button class="button primary" id="hug">One little hug? <span aria-hidden="true">♡</span></button><p class="hug-status" id="hug-status" role="status"></p><button class="text-button" id="replay">Another adventure, another little note →</button><p class="small-note">This one stays here until you finish a new adventure.</p></section>`;
  $('hug').onclick = () => {
    $('hug-status').textContent = 'Consider yourself hugged, Princess. The real one is waiting for you. ♡';
    celebrate();
    const envelope = app.querySelector<HTMLElement>('.envelope')!;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) envelope.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1) rotate(-5deg)' }, { transform: 'scale(1)' }], { duration: 650 });
  };
  $('replay').onclick = () => { progress.replay(); render(); };
}

function render() {
  clearScreen();
  if (!progress.value.started) welcome();
  else if (progress.value.stage === 0) memory();
  else if (progress.value.stage === 1) sequence();
  else if (progress.value.stage === 2) void catcher();
  else letter();
  focusTitle();
}
render();
