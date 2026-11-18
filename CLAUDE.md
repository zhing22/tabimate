# Tabimate — project brief

## What it is

Tabimate (旅 tabi = journey + mate) is a daily browser trivia game about animals.
Everyone gets the same prompts each day (e.g. "Name an animal that lays eggs").
The player types an animal; rarer matched answers score a higher level (0–5).
Each matched animal joins a trail of followers behind the player. Each answer moves the
player forward by its level; crossing score thresholds enters new biomes
(Town → Grassland → Forest → …). The run ends with a shareable team card.
Original art and naming only: no Pokémon names, sprites or UI.

## Rules of the game

- Daily reset at 12:00 (noon) Asia/Singapore (RESET_HOUR in config/game.ts).
  Puzzle key = the SGT date (YYYY-MM-DD) on which that puzzle started, so
  00:00–11:59 SGT still plays the previous date's puzzle.
- MVP: 3 prompts per day (config value, will become 7), 25 s timer per prompt. The game
  plays however many prompts a puzzle file has (1 to MAX_PROMPTS_PER_PUZZLE). After
  each answer the result stays up until the player taps Next (or presses Enter); the
  next prompt's timer starts then. While the result is up, as its name shows, the animal joins
  the party in the scene and everyone walks on (into the next biome if the score crossed
  a threshold).
- Levels (LEVELS in config/tiers.ts): 0 no match; 1 Least Concern, 2 Near Threatened,
  3 Vulnerable, 4 Endangered, 5 Critically Endangered. Points come only from
  core/scoring.ts (pointsFor, dayTotal); see Scoring (v2).
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
    (e.g. a correction the player left in the box), otherwise level 0. An empty box
    is level 0. There is no random or "lucky" scoring.
- One run per day; progress is saved and resumable.

## Tech

- Vite + TypeScript (strict), Kaplay for the canvas scene, HTML/CSS for UI.
- Vitest for tests. ESLint + Prettier.
- Static hosting on Cloudflare Pages. No backend in the MVP.
- Pixel art: scene is 180 native px tall, scaled by a whole number (computed in device pixels);
  layers tile horizontally. Sprites use 6 template key colours, recoloured from palettes.json.
- Reveal and effects: the reveal card plays a drum-roll (longer for rarer levels), the level
  badge popping in, then the name (REVEAL_TIMING in config/game.ts). Each level's effect
  (LEVELS[].effectId: none, glint, sparkle, shiny) has a scene effect in scene/effects/
  (entrance when the animal joins, then a subtle idle loop) and a badge style in
  reveal.css. Reduced motion: no shake or particles, only fades.
- Results page: on phones too, the card floats over the full-window scene of the biome
  reached. The party line-up (traveller in front, animals behind) walks on the spot in a
  framed snapshot of that biome (Scene.backdrops; emoji and plain colours without a scene).
  Team rows show sprites and open to list every accepted answer with its points.
- Sharing: services/share.ts builds the share text (title, level squares, animal emoji, the
  site link; never animal names or prompts) from shareCard(), plain data an image card
  can reuse. Phones get the share sheet, desktops copy to the clipboard.
- Sound: services/audio.ts is the only thing that plays audio, driven by bus events.
  Sounds are synthesised (services/sounds.ts), unlocked on the first tap or key, and
  muted with the corner button (kept via StorageAdapter).
- Sprite pipeline: public/assets/sprites/{archetype}.png + .json (Aseprite export, frame
  tags walk and flap or swim), listed in manifest.json, drawn only in TEMPLATE_KEYS
  (config/render.ts). animals.json gives each animal palette, shinyPalette and
  paletteOverride; palette colours come from data/master-palette.json (tested). An
  animal without a sheet or palette is drawn as its emoji. SPRITE_SOURCE picks the provider.
  A group has no art of its own: the pixel provider draws it with its representative's
  sheet and palette (core/hierarchy.ts representativeFor).

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
- Biomes, levels, effects and matcher strategies are registries: adding one means
  adding an entry, not editing a switch statement.

## Code style

- Small files (aim < 150 lines) and small functions (aim < 30 lines), one job each.
- Named exports only. No default exports. No `any`.
- Pure functions where possible; side effects at the edges.
- Every exported function in core/ has a unit test.
- Comments explain why, not what.
- Mobile first: must work at 360 px wide with the on-screen keyboard open.

## Commands

- npm run dev | npm run build | npm run test | npm run check (data + typecheck + lint + test)
- npm run validate-data: every file in public/data, plus a puzzle for each of the next 7
  SGT days; part of check, and of the GitHub workflow (every push, PR, and daily).
- ?debug=1 on any page (live too): the debug panel (play another date, see how the matcher
  read each guess, reset local progress). PLAYTEST.md is the playtest checklist.
- Dev-only pages (not in the build): /dev/scene.html replays a scripted run in the scene
  (?step=N jumps ahead, ?restore rebuilds a finished run, ?emoji for placeholders) with an
  fps readout. /dev/palettes.html tunes palettes by eye and copies them as JSON.
- npm run pixelate -- <folder> --size 24 [--colors 6] [--master]: AI images to rough pixel
  art in art/pixelated/. npm run art:sample redraws the placeholder big-cat sheet.
- npx tsx scripts/migrate-puzzles-v2.ts [--fix-cr] [--write]: the one-off v1 to v2 data
  migration (tier to level, kind: species) and a report of prompts without exactly one
  CR. Dry run unless --write; safe to rerun.

## Scoring (v2)

- Every answer on every prompt has a hand-set level 1–5. Points are fixed per level in
  config/tiers.ts: 1 LC 10, 2 NT 25, 3 VU 50, 4 EN 85, 5 CR 100. Labels are flavour only;
  they do not mean real conservation status.
- Exactly one level-5 (CR) answer per prompt, unless the day sets maxCR (Sunday Deep Dive).
- Animals are `group` ("penguin") or `species` ("African penguin", parent: penguin).
  Groups are normal answers, usually low level. A group has a `representative` species
  used for its sprite.
- A family name ("hummingbird", "duck", "fox") is never a species alias: it is its own
  group answer, so a general guess scores the group's level, not a rarer species'.
  Groups can nest (giant salamander under salamander).
- The validator (data/validate.ts, data/checkHierarchy.ts) enforces: levels 1–5, the CR
  rule (PuzzleContext.maxCR), parents that exist and are groups (no loops), each group's
  representative a species below it, no animal twice on a prompt. A species ranked below
  its own group on a prompt is only a warning (validate-data prints it).
- Saves: SCHEMA_VERSION 2. Migration 1 renamed match.tier to match.level and history
  tiers to levels (services/saveData.ts).
- 100 is the maximum per answer. Day multipliers (bonus quiz) apply to the day total only.

## Matching (unchanged rules, keep them)

- Only an exact display name or alias scores. Close guesses (typo, partial, loose) are
  corrected to the exact name and must be confirmed with Go. Wrong guesses can be retried.
- Ties between equally scored candidates go to the lower level, then the group, then the
  shorter display name, then a hash (core/matcher/pick.ts compareTies), so a suggestion
  never jumps to a rarer answer than the player typed.
- No random or lucky matching, ever.

## Content

- 7 prompts per day. Themes per weekday live in config/themes.ts.
- Animal records carry traits, a one-line description (15 words or fewer, drafted from
  Wikipedia, `descriptionReviewed` flag) and a `wiki` link that is always shown beside it.

## New architecture rules

- New features hook in through registries: themes, prompt templates, achievements,
  journal sets, reveal extras, biome borders, movement strategies.
- Anything that talks to a server goes behind an interface in src/data or src/services,
  with a local implementation, so the game still works offline and as a guest.
- Server code lives in functions/ (Cloudflare Pages Functions) and shares types from
  src/core/types.ts; it never imports from ui/ or scene/.
