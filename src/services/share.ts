import type { BiomeDef } from '@/config/biomes';
import { TIERS, type TierId } from '@/config/tiers';
import { totalScore } from '@/core/journey';
import type { Animal, AnimalId, RoundResult } from '@/core/types';

/** A finished run, as the share text and (later) a share image need it. */
export interface ShareRun {
  readonly results: readonly RoundResult[];
  readonly animals: ReadonlyMap<AnimalId, Animal>;
}

/** Shown for a prompt that ended with no animal (time ran out). */
export const MISS_EMOJI = '💨';

/**
 * What a share shows, as data: no text layout, no URL. The text below uses it,
 * and an image share card can use the same thing later.
 */
export interface ShareCard {
  readonly puzzleNumber: number;
  readonly biome: { readonly name: string; readonly emoji: string };
  /** One per prompt, in order. */
  readonly tiers: readonly TierId[];
  /** Each prompt's animal as an emoji (MISS_EMOJI for none), in order. */
  readonly animalEmoji: readonly string[];
  readonly score: number;
}

export function shareCard(run: ShareRun, puzzleNumber: number, biome: BiomeDef): ShareCard {
  return {
    puzzleNumber,
    biome: { name: biome.name, emoji: biome.emoji },
    tiers: run.results.map((r) => r.match.tier),
    animalEmoji: run.results.map((r) =>
      r.match.animalId === null ? MISS_EMOJI : (run.animals.get(r.match.animalId)?.emoji ?? '🐾'),
    ),
    score: totalScore(run.results),
  };
}

/**
 * The text players paste into chats:
 *
 *   Tabimate #12 🌲 Forest
 *   🟦🟪🟨  185 pts
 *   🦊🦉🐸
 *   https://…
 *
 * Tiers come from config (TIERS[].emoji), animals as emoji only: the prompts
 * and the animals' names stay unspoiled. Plain lines joined by \n, the link on
 * its own last line, so WhatsApp, Telegram and X all show it as written and
 * turn the link into a preview.
 */
export function buildShareText(
  run: ShareRun,
  puzzleNumber: number,
  biomeReached: BiomeDef,
  url: string,
): string {
  const card = shareCard(run, puzzleNumber, biomeReached);
  return [
    `Tabimate #${card.puzzleNumber} ${card.biome.emoji} ${card.biome.name}`,
    `${card.tiers.map((tier) => TIERS[tier].emoji).join('')}  ${card.score} pts`,
    card.animalEmoji.join(''),
    url,
  ].join('\n');
}

/** How a share went, so the UI can say "Copied!" or nothing at all. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareEnvironment {
  readonly navigator: Pick<Navigator, 'clipboard'> & { share?: Navigator['share'] };
  /** Touch devices get the system share sheet; desktops copy (their sheets are clumsy). */
  readonly preferSheet: boolean;
  /** Last resort for old browsers without the clipboard API. */
  readonly copyByHand?: (text: string) => boolean;
}

const browserEnvironment = (): ShareEnvironment => ({
  navigator,
  preferSheet: window.matchMedia('(pointer: coarse)').matches,
  copyByHand(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  },
});

/**
 * Shares with the system sheet on phones (navigator.share), otherwise copies
 * to the clipboard. A dismissed sheet is 'cancelled'; a sheet that fails falls
 * back to copying.
 */
export async function share(
  text: string,
  env: ShareEnvironment = browserEnvironment(),
): Promise<ShareOutcome> {
  const nav = env.navigator;
  if (env.preferSheet && typeof nav.share === 'function') {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Not allowed or not supported here: copy instead.
    }
  }
  try {
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return env.copyByHand?.(text) ? 'copied' : 'failed';
  }
}
