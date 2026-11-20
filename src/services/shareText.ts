// The share text: what a finished day looks like when pasted into a chat.
import type { BiomeDef } from '@/config/biomes';
import { MISS_EMOJI } from '@/config/game';
import { LEVELS, type LevelId } from '@/config/levels';
import { dayTotal } from '@/core/scoring';
import type { Animal, AnimalId, RoundResult } from '@/core/types';

/** A finished run, as the share text and (later) a share image need it. */
export interface ShareRun {
  readonly results: readonly RoundResult[];
  readonly animals: ReadonlyMap<AnimalId, Animal>;
}

/**
 * What a share shows, as data: no text layout, no URL. The text below uses it,
 * and an image share card can use the same thing later.
 */
export interface ShareCard {
  readonly puzzleNumber: number;
  /** The day's theme name ("Fishy Friday"), or null on a plain day. */
  readonly theme: string | null;
  readonly biome: { readonly name: string; readonly emoji: string };
  /** One per prompt, in order. */
  readonly levels: readonly LevelId[];
  /** Each prompt's animal as an emoji (MISS_EMOJI for none), in order. */
  readonly animalEmoji: readonly string[];
  readonly score: number;
}

export function shareCard(
  run: ShareRun,
  puzzleNumber: number,
  biome: BiomeDef,
  theme: string | null = null,
): ShareCard {
  return {
    puzzleNumber,
    theme,
    biome: { name: biome.name, emoji: biome.emoji },
    levels: run.results.map((r) => r.match.level),
    animalEmoji: run.results.map((r) =>
      r.match.animalId === null ? MISS_EMOJI : (run.animals.get(r.match.animalId)?.emoji ?? '🐾'),
    ),
    score: dayTotal(run.results),
  };
}

/**
 * The text players paste into chats:
 *
 *   Tabimate #12 🌲 Forest            (a themed day: Tabimate #31 · Fishy Friday 🌲 Forest)
 *   🟦🟪🟨  185 pts
 *   🦊🦉🐸
 *   https://…
 *
 * Levels come from config (LEVELS[].emoji), animals as emoji only: the prompts
 * and the animals' names stay unspoiled. Plain lines joined by \n, the link on
 * its own last line, so WhatsApp, Telegram and X all show it as written and
 * turn the link into a preview.
 */
export function buildShareText(
  run: ShareRun,
  puzzleNumber: number,
  biomeReached: BiomeDef,
  url: string,
  theme: string | null = null,
): string {
  const card = shareCard(run, puzzleNumber, biomeReached, theme);
  const title = card.theme
    ? `Tabimate #${card.puzzleNumber} · ${card.theme}`
    : `Tabimate #${card.puzzleNumber}`;
  return [
    `${title} ${card.biome.emoji} ${card.biome.name}`,
    `${card.levels.map((level) => LEVELS[level].emoji).join('')}  ${card.score} pts`,
    card.animalEmoji.join(''),
    url,
  ].join('\n');
}
