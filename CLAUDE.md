Tabimate — project brief
What it is

Tabimate (旅 tabi = journey + mate) is a daily browser trivia game about animals. Everyone gets the same prompts each day (e.g. "Name an animal that lays eggs"). The player types an animal; each accepted answer has a hand-set level (1–5, 0 for no match). Each matched animal joins a trail of followers behind the player. Each answer moves the player forward by its level; crossing score thresholds enters new biomes (Town → Grassland → Forest → …). The run ends with a shareable team card. Original art and naming only: no Pokémon names, sprites or UI.

Status (read before assuming a feature exists)
Built: the MVP, v2 Step 1 (levels, groups, data migration) and v2 Step 2 (group-aware tie-breaks).
Planned, not built yet: themes and maxCR (config/themes.ts, v2 Step 5), traits and descriptions (v2 Step 3), the puzzle editor (Step 4), server features in functions/ (Steps 13–15). When a rule below mentions one of these, it describes the target design; check the code before relying on it.
Update this section at the end of every step.
Rules of the game
Daily reset at 12:00 (noon) Asia/Singapore (RESET_HOUR in config/game.ts). Puzzle key = the SGT date (YYYY-MM-DD) on which that puzzle started, so 00:00–11:59 SGT still plays the previous date's puzzle. Weekday themes follow the puzzle key's date, not the clock.
7 prompts per day, 25 s timer per prompt. The game plays however many prompts a puzzle file has (1 to MAX_PROMPTS_PER_PUZZLE). After each answer the result stays up until the player taps Next (or presses Enter); the next prompt's timer starts then. While the result is up, the animal joins the party in the scene and everyone walks on (into the next biome if the score crossed a threshold).
One run per day; progress is saved and resumable.
Levels and scoring
Levels (LEVELS in config/tiers.ts): 0 no match; 1 LC Least Concern, 2 NT Near Threatened, 3 VU Vulnerable, 4 EN Endangered, 5 CR Critically Endangered. Labels are flavour only; they do not mean real conservation status.
Every answer on every prompt has a hand-set level 1–5. Points are fixed per level: 1 = 10, 2 = 25, 3 = 50, 4 = 85, 5 = 100. Points come only from core/scoring.ts (pointsFor, dayTotal).
Exactly one level-5 (CR) answer per prompt. Once themes exist, a day's theme may set maxCR (Sunday Deep Dive) to allow more; until then every prompt has exactly one.
100 is the maximum per answer. Day multipliers (bonus quiz) apply to the day total only.
Answering and matching
Only an answer's exact display name scores (after normalising case, accents, punctuation and plurals: "killer whales!" is exact for Killer whale).
On each Go the guess runs through the matcher strategies in order: exact, alias, typo, partial, loose (core/matcher/strategies.ts).
exact: scored and revealed at once.
alias, typo, partial or loose: not scored. The box is replaced with that animal's exact name (selected) and a one-line hint says "Did you mean this? Press Go to answer." Go again submits it; typing replaces it.
no match: not scored. The box keeps the text and a one-line red message says it is not on today's list. The player can retry until time runs out.
A guess naming two or more animals ("platypus tiger koala"), or more than one word longer than the name it matched, counts as no match, so pasting a list never beats naming one animal.
Time-up submits whatever is in the box: scored only if it is an exact name (e.g. a correction the player left in the box), otherwise level 0. An empty box is level 0.
Ties between equally scored candidates (one strategy, same score) go, in order, to: the display name containing the whole guess as whole words, the shorter display name, a group over a species, the lower level, then a hash (TIE_RULES and compareTies in core/matcher/pick.ts). partial returns a group whose whole name or alias is the guess, never a species that merely starts with it. The debug panel shows which rule broke a tie.
No random or lucky matching, ever. Matcher thresholds live in MATCHER_CONFIG (config/game.ts).
Content and data
Animals are group ("penguin") or species ("African penguin", parent: penguin). Groups are normal answers, usually low level, and can nest (giant salamander under salamander). A group has a representative species used for its sprite.
A family name ("hummingbird", "duck", "fox") is never a species alias: it is its own group answer, so a general guess scores the group's level, not a rarer species'.
Planned (v2 Step 3): animal records carry traits, a one-line description (15 words or fewer, drafted from Wikipedia, descriptionReviewed flag) and a wiki link that is always shown beside the description.
The validator (data/validate.ts, data/checkHierarchy.ts) enforces: levels 1–5, the CR rule (from LEVEL_RULES_FROM), parents that exist and are groups (no loops), each group's representative a species below it, no animal twice on a prompt. validate-data (data/checkNames.ts) also fails when an answer's display name does not score exactly on its own prompts, or an alias resolves to another answer (so a correction always leads to a score). A species ranked below its own group on a prompt is only a warning (validate-data prints it).
Released puzzles are frozen: a player's stored levels must keep matching the file. Puzzles before LEVEL_RULES_FROM (config/game.ts, 2026-11-19) keep their v1 answers and levels and are only checked for shape. validate-data warns when a day that has gone live differs from scripts/released-puzzles.json; record new live days with npm run validate-data -- --record. Fix a released day by changing a future one.
Saves: SCHEMA_VERSION 2. Migration 1 renamed match.tier to match.level and history tiers to levels (services/saveData.ts). Any change to saved data needs a version bump and a migration.
Tech
Vite + TypeScript (strict), Kaplay for the canvas scene, HTML/CSS for UI.
Vitest for tests. ESLint + Prettier.
Static hosting on Cloudflare Pages. Server features (planned) run as Cloudflare Pages Functions with D1 in functions/; the game must always work offline and as a guest.
Pixel art: scene is 180 native px tall, scaled by a whole number (computed in device pixels); layers tile horizontally. Sprites use 6 template key colours, recoloured from palettes.json.
Reveal and effects: the reveal card plays a drum-roll (longer for higher levels), the level badge popping in, then the name (REVEAL_TIMING in config/game.ts). Each level's effect (LEVELS[].effectId: none, glint, sparkle, shiny) has a scene effect in scene/effects/ (entrance when the animal joins, then a subtle idle loop) and a badge style in reveal.css. Reduced motion: no shake or particles, only fades.
Results page: on phones too, the card floats over the full-window scene of the biome reached. The party line-up (traveller in front, animals behind) walks on the spot in a framed snapshot of that biome (Scene.backdrops; emoji and plain colours without a scene). Team rows show sprites and open to list every accepted answer with its points.
Sharing: services/share.ts builds the share text (title, level squares, animal emoji, the site link; never animal names or prompts) from shareCard(), plain data an image card can reuse. Phones get the share sheet, desktops copy to the clipboard.
Sound: services/audio.ts is the only thing that plays audio, driven by bus events. Sounds are synthesised (services/sounds.ts), unlocked on the first tap or key, and muted with the corner button (kept via StorageAdapter).
Sprite pipeline: public/assets/sprites/{archetype}.png + .json (Aseprite export, frame tags walk and flap or swim), listed in manifest.json, drawn only in TEMPLATE_KEYS (config/render.ts). animals.json gives each animal palette, shinyPalette and paletteOverride; palette colours come from data/master-palette.json (tested). An animal without a sheet or palette is drawn as its emoji. SPRITE_SOURCE picks the provider. A group has no art of its own: the pixel provider draws it with its representative's sheet and palette (core/hierarchy.ts representativeFor).
Architecture rules (must follow)
Layers: config, core, data, services, ui, scene, plus functions/ for server code. main.ts wires the client together.
core/ is pure TypeScript: no DOM, no Kaplay, no fetch, no localStorage, no Date.now() without injection. It is fully unit-tested.
ui/ and scene/ never call each other. They both react to events from core/events.ts and send user intents back to the game machine.
External dependencies sit behind interfaces: PuzzleSource, StorageAdapter, SpriteProvider, Clock, and later StatsSource and AccountSource. The interfaces live in core/ (so the game machine can use them); implementations live in data/, services/ or scene/. main.ts chooses them. Anything that talks to a server also has a local implementation, so the game still works offline and as a guest.
functions/ shares types from src/core/types.ts and its own functions/lib/; it never imports from ui/ or scene/.
Tuneable values live in config/, never as magic numbers in logic.
Features hook in through registries: adding one means adding an entry, not editing a switch statement. Existing: biomes, levels, effects, matcher strategies. Planned: themes, prompt templates, achievements, journal sets, reveal extras, biome borders, movement strategies.
Code style
Small files (aim < 150 lines) and small functions (aim < 30 lines), one job each.
Named exports only. No default exports. No any.
Pure functions where possible; side effects at the edges.
Every exported function in core/ has a unit test.
Comments explain why, not what.
Mobile first: must work at 360 px wide with the on-screen keyboard open.
Commands
npm run dev | npm run build | npm run test | npm run check (data + typecheck + lint + test)
npm run validate-data: every file in public/data, plus a puzzle for each of the next 7 SGT days; part of check, and of the GitHub workflow (every push, PR, and daily).
?debug=1 on any page (live too): the debug panel (play another date, see how the matcher read each guess, reset local progress). PLAYTEST.md is the playtest checklist.
Dev-only pages (not in the build): /dev/scene.html replays a scripted run in the scene (?step=N jumps ahead, ?restore rebuilds a finished run, ?emoji for placeholders) with an fps readout. /dev/palettes.html tunes palettes by eye and copies them as JSON.
npm run pixelate -- <folder> --size 24 [--colors 6] [--master]: AI images to rough pixel art in art/pixelated/. npm run art:sample redraws the placeholder big-cat sheet.
npx tsx scripts/migrate-puzzles-v2.ts [--fix-cr] [--write]: the one-off v1 to v2 data migration (tier to level, kind: species) and a report of prompts without exactly one CR. Dry run unless --write; safe to rerun.
