# Tabimate — project brief

## What it is

Tabimate (旅 tabi = journey + mate) is a daily browser trivia game about animals.
Everyone gets the same prompts each day (e.g. "Name an animal that lays eggs").
The player types an animal; rarer matched answers score a higher tier (0–5).
Each matched animal joins a trail of followers behind the player. Each answer moves the
player forward by its tier; crossing score thresholds enters new biomes
(Town → Grassland → Forest → …). The run ends with a shareable team card.
Original art and naming only: no Pokémon names, sprites or UI.

## Rules of the game

- Daily reset at 12:00 (noon) Asia/Singapore (RESET_HOUR in config/game.ts).
  Puzzle key = the SGT date (YYYY-MM-DD) on which that puzzle started, so
  00:00–11:59 SGT still plays the previous date's puzzle.
- MVP: 3 prompts per day (config value, will become 7), 25 s timer per prompt. The game
  plays however many prompts a puzzle file has (1 to MAX_PROMPTS_PER_PUZZLE). After
  each answer the result stays up until the player taps Next (or presses Enter); the
  next prompt's timer starts then.
- Tiers: 0 no match; 1 Least Concern, 2 Near Threatened, 3 Vulnerable,
  4 Endangered, 5 Critically Endangered.
- Answering: only an answer's exact name scores (after normalising case, punctuation
  and plurals: "killer whales!" is exact for Killer whale). On each Go the guess is run
  through the matcher strategies in order: exact, alias, typo, partial, loose
  (core/matcher/strategies.ts).
  - exact: scored and revealed at once.
  - alias, typo, partial or loose: not scored. The box is replaced with that
    animal's exact name (selected) and a one-line hint says "Did you mean this? Press
    Go to answer." Go again submits it; typing replaces it.
  - no match: not scored. The box keeps the text and a one-line red message says
    it is not on today's list. The player can retry until time runs out.
  - A guess naming two or more animals ("platypus tiger koala") counts as no match,
    so pasting a list never beats naming one animal.
  - Time-up submits whatever is in the box: scored only if it is an exact name
    (e.g. a correction the player left in the box), otherwise tier 0. An empty box
    is tier 0. There is no random or "lucky" scoring.
- One run per day; progress is saved and resumable.

## Tech

- Vite + TypeScript (strict), Kaplay for the canvas scene, HTML/CSS for UI.
- Vitest for tests. ESLint + Prettier.
- Static hosting on Cloudflare Pages. No backend in the MVP.
- Pixel art: scene is 180 native px tall, scaled by a whole number (computed in device pixels);
  layers tile horizontally. Sprites use 6 template key colours, recoloured from palettes.json.

## Architecture rules (must follow)

- Layers: config, core, data, services, ui, scene. main.ts wires them together.
- core/ is pure TypeScript: no DOM, no Kaplay, no fetch, no localStorage, no Date.now()
  without injection. It is fully unit-tested.
- ui/ and scene/ never call each other. They both react to events from core/events.ts
  and send user intents back to the game machine.
- External dependencies sit behind interfaces: PuzzleSource, StorageAdapter,
  SpriteProvider, Clock. The interfaces live in core/ (so the game machine can use
  them); implementations live in data/, services/ or scene/. main.ts chooses them.
- Tuneable values live in config/, never as magic numbers in logic.
- Biomes, tiers, effects and matcher strategies are registries: adding one means
  adding an entry, not editing a switch statement.

## Code style

- Small files (aim < 150 lines) and small functions (aim < 30 lines), one job each.
- Named exports only. No default exports. No `any`.
- Pure functions where possible; side effects at the edges.
- Every exported function in core/ has a unit test.
- Comments explain why, not what.
- Mobile first: must work at 360 px wide with the on-screen keyboard open.

## Commands

- npm run dev | npm run build | npm run test | npm run check (typecheck + lint + test)
- Dev-only pages (not in the build): /dev/scene.html replays a scripted run in the scene
  (?step=N jumps ahead, ?restore rebuilds a finished run) with an fps readout.
