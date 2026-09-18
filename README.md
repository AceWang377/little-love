# A little adventure for Princess Jayde

A small pink corner of the internet, made with love by Ace. Three gentle games unlock one of sixty handwritten notes.

## Play

[Open the adventure](https://acewang377.github.io/little-love/)

1. Find eight pairs of cards.
2. Repeat four patterns of three to six lights.
3. Catch eight hearts during a 25-second shower. If needed, a bigger basket gives up to five extra seconds; the chapter always finishes by 30 active seconds.

Touch, mouse, and keyboard work. The arrow keys or the slider move the basket. Pause stops play; returning from a background tab requires resuming. No account, server, API key, or AI call is needed.

Completed chapters and letter history stay in this browser's local storage. Refresh restarts an unfinished chapter. Each cycle of sixty completed adventures draws distinct notes; the next cycle cannot begin with the previous cycle's last note. Existing thirty-letter saves keep their current note and progress, with the thirty new notes added to their unread pool once. Refreshing or hugging never redraws a letter. Clearing browser data resets history. Storage-disabled browsers keep in-memory progress until the page closes.

## Develop

Node.js 22.12 or newer:

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

The app is served under `/little-love/` in development and production. The Pages workflow tests and builds every push to `main`, then deploys `dist`. Set the repository's Pages source to **GitHub Actions**.

## Code

- `src/games.ts`: renderer-independent matching, sequence, and catching rules.
- `src/progress.ts`: chapter checkpoints and non-repeating letter draws.
- `src/letters.ts`: sixty editable notes.
- `src/main.ts`: accessible DOM games, menus, and letter presentation.
- `src/catcher.ts`: Phaser rendering and basket input.

Names and letters are public source content. The noindex setting requests search engines not to index the site; it does not make the site private.

## References and artwork

See [CREDITS.md](CREDITS.md). This is an original implementation; no source code or artwork from the reference game repositories was copied. Line icons are drawn in this project. The envelope artwork is retained from Ace's original version of this game and served locally.
