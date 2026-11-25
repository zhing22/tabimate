# Tabimate playtest

Goal: 5–10 friends play for a few days. Done when three daily resets (12:00 noon
Singapore time) have passed in production without problems, and you have a list of
prompt and answer fixes.

## Before you invite anyone

- [ ] `npm run check` passes locally and on GitHub (the **check** workflow is green).
      It fails if any data file is broken or a puzzle is missing for the next 7 SGT
      days, so add puzzles at least a week ahead (`public/data/puzzles/YYYY-MM-DD.json`).
- [ ] Deployed on Cloudflare Pages: connect the GitHub repo, build command
      `npm run build`, output directory `dist`, Node 22.
- [ ] Open the live site on your own phone and play the day through once.
- [ ] Open it with `?debug=1` and check the date shown is today's in Singapore time.
- [ ] Share link and text: tap Share at the end and paste into WhatsApp, Telegram and X.
      The text should keep its four lines and the link should show a preview.

## Devices to cover

Aim for at least one tester on each:

| Device                           | Watch especially                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| iPhone, Safari                   | tap the box: the stage slides away; a scored answer closes the keyboard; sound starts on tap |
| Android phone, Chrome            | layout above the keyboard; pixel art is sharp, not blurry                                    |
| Small phone (≈ 360 px wide)      | nothing cut off; the answer box and Next button fit                                          |
| Tablet                           | layout in portrait and landscape                                                             |
| Laptop or desktop, Chrome/Safari | Enter to answer and continue; Share copies the text                                          |
| Someone using reduced motion     | no shaking or sparks; everything still readable                                              |

## What to watch for

**Unfair matches** (the most important)

- A correct animal that was rejected ("Not on today's list") but should count.
- A guess corrected to the wrong animal ("Did you mean…?").
- An answer that counted but shouldn't (a wrong fact in an answer list).
- Players who spam guesses: does correcting typos make the game too easy?

**Prompt clarity**

- Prompts people found vague or argued about ("fast", "colourful", "near water").
- Prompts where nobody found a rare (high-level) answer, or everyone did.

**Timer length**

- Did most rounds end with time to spare, or did people run out at 25 s?
- Did the time-up auto-submit feel fair?

**The journey**

- Which biome did each player reach (Town, Grassland, Forest)? If almost everyone
  reaches the Forest, or almost no one leaves the Town, the thresholds in
  `config/biomes.ts` need moving.
- Did people notice the animals joining, and the shiny effects?

**Daily reset**

- At 12:00 SGT the next puzzle appears, the countdown hits 00:00:00, and a played
  day shows its results straight away when reopened.
- Streaks: playing two days in a row shows a 2-day streak; skipping a day resets it.

## How to collect feedback

- One group chat or a shared note for the playtest. Ask each tester, once a day, for:
  1. their share text (paste it as is),
  2. any answer they thought was wrongly rejected or accepted, with the prompt,
  3. anything confusing or broken, with their phone model and browser.
- For a suspicious match, ask them (or check yourself) with `?debug=1` on the live
  site: the panel's guess log shows how the matcher read each guess (strategy,
  confidence, the animal it chose) and what the game did with it.
- The debug panel's **Reset progress** clears a tester's save, and **Play this date**
  opens another day's puzzle. Note that this lets testers see future puzzles, so
  only point people at it when you need them to retry something.

## After each day

- [ ] Write every reported prompt or answer problem in a list (date, prompt, guess,
      what should have happened).
- [ ] Fix data in `public/data` (animals' aliases, answer lists, levels), run
      `npm run check`, push. The live site updates on the next deploy.
- [ ] Count the resets that passed without problems: three in a row means this step is done.
