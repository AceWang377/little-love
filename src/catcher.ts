import Phaser from 'phaser';
import { CatchGame } from './games';

export function mountCatcher(parent: HTMLElement, model: CatchGame, onUpdate: () => void, onComplete: () => void) {
  let finished = false;
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    model.paused = document.hidden || parent.closest('.play-wrap')?.getAttribute('data-paused') === 'true';
    model.move(model.basketX + (event.key === 'ArrowLeft' ? -24 : 24));
  };
  window.addEventListener('keydown', onKey);
  class HeartScene extends Phaser.Scene {
    private shapes!: Phaser.GameObjects.Graphics;
    create() {
      this.shapes = this.add.graphics();
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => model.move(pointer.x));
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (pointer.isDown) model.move(pointer.x); });
      this.game.canvas.setAttribute('aria-hidden', 'true');
    }
    update(_time: number, delta: number) {
      if (finished) return;
      model.paused = document.hidden || parent.closest('.play-wrap')?.getAttribute('data-paused') === 'true';
      model.tick(delta / 1000);
      this.draw();
      onUpdate();
      if (model.complete) { finished = true; onComplete(); }
    }
    private draw() {
      const g = this.shapes;
      g.clear();
      // A quiet garden of line-art stars behind the moving hearts.
      g.fillStyle(0xe9c7d0, 0.65);
      for (let i = 0; i < 16; i++) {
        const x = (i * 79 + 37) % 340 + 10, y = (i * 53 + 17) % 305 + 15;
        g.fillCircle(x, y, i % 3 === 0 ? 2 : 1);
      }
      for (const heart of model.hearts) {
        const x = heart.x, y = heart.y, r = 7;
        g.fillStyle(heart.id % 3 === 0 ? 0x782a41 : 0xc86b88, 1);
        g.fillCircle(x - r * 0.55, y - r * 0.45, r);
        g.fillCircle(x + r * 0.55, y - r * 0.45, r);
        g.fillTriangle(x - r * 1.4, y + r * 0.1, x + r * 1.4, y + r * 0.1, x, y + r * 1.9);
      }
      const w = model.basketWidth, x = model.basketX - w / 2;
      g.lineStyle(2, 0x782a41, 1);
      g.strokeRoundedRect(x + w * 0.23, 333, w * 0.54, 40, 19);
      g.fillStyle(0xf0ced9, 1);
      g.fillRoundedRect(x, 351, w, 37, { tl: 4, tr: 4, bl: 17, br: 17 });
      g.strokeRoundedRect(x, 351, w, 37, { tl: 4, tr: 4, bl: 17, br: 17 });
      g.lineStyle(1, 0xb57387, 0.7);
      for (let i = 1; i < 6; i++) g.lineBetween(x + w * i / 6, 357, x + w * i / 6, 382);
      g.lineBetween(x + 6, 365, x + w - 6, 365);
      g.lineBetween(x + 8, 376, x + w - 8, 376);
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, width: 360, height: 410, parent,
    backgroundColor: '#fff9f9', transparent: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: HeartScene, banner: false,
    audio: { noAudio: true },
    input: { keyboard: false },
  });
  return () => { window.removeEventListener('keydown', onKey); game.destroy(true); };
}
