// The share image's input (the team in line-up order, the scene, the text)
// and its drawing: loaded on first use, as the results open, so none of it is
// in the first JavaScript (wiring/startShare.ts).
import { themeFor } from '@/config/themes';
import { isShiny, LEVELS } from '@/config/levels';
import { APP_COLOURS, RESULTS_RIGHT_GROUP_FACING } from '@/config/ui';
import { biomeFor } from '@/core/journey';
import { lineupSides } from '@/core/lineup';
import {
  renderShareImage,
  shareImageFile,
  type ShareImageInput,
  type ShareImageMember,
} from '@/services/shareImage';
import { MISS_EMOJI } from '@/services/share';
import type { FinishedRun } from '@/ui/app';
import { formatDateKey } from '@/ui/format';
import type { ShareDeps } from './startShare';

export { downloadImage } from '@/services/shareImage';

const cssColour = (token: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || APP_COLOURS.ink;

/**
 * The team as the results line-up stands (core/lineup.ts): Q7 Q6 Q5 facing
 * right, the traveller, Q4 Q3 Q2 Q1 facing RESULTS_RIGHT_GROUP_FACING.
 */
async function lineup(
  deps: ShareDeps,
  byPrompt: readonly ShareImageMember[],
): Promise<ShareImageMember[]> {
  const { left, right } = lineupSides(byPrompt);
  const traveller: ShareImageMember = {
    picture: (await deps.portraits?.(null, false)) ?? null,
    emoji: '🧑',
    badge: null,
  };
  return [
    ...left.map((m) => ({ ...m, facing: 'right' as const })),
    traveller,
    ...right.map((m) => ({ ...m, facing: RESULTS_RIGHT_GROUP_FACING })),
  ];
}

async function imageInput(deps: ShareDeps, run: FinishedRun): Promise<ShareImageInput> {
  const { puzzle, animals } = deps;
  const theme = themeFor(puzzle.date)?.name ?? null;
  const biome = biomeFor(run.base); // the walk's end: the answers' points
  const byPrompt = await Promise.all(
    run.results.map(async ({ match }) => {
      const animal = match.animalId === null ? null : (animals.get(match.animalId) ?? null);
      if (!animal || match.level === 0) return { picture: null, emoji: MISS_EMOJI, badge: null };
      const level = LEVELS[match.level];
      return {
        picture: (await deps.portraits?.(animal, isShiny(match.level))) ?? null,
        emoji: animal.emoji,
        badge: {
          text: level.shortName,
          colour: cssColour(level.colour),
          ink: cssColour(`${level.colour}-ink`),
        },
      };
    }),
  );
  return {
    title: theme ? `Tabimate #${puzzle.number} · ${theme}` : `Tabimate #${puzzle.number}`,
    subtitle: formatDateKey(puzzle.date),
    score: run.score,
    biome: `${biome.emoji} ${biome.name}`,
    sky: [biome.palette.skyTop, biome.palette.skyBottom],
    ground: biome.palette.ground,
    ink: cssColour('--ink'),
    backdrop: (await deps.backdrops?.(run.base)) ?? null,
    members: await lineup(deps, byPrompt),
    footer: deps
      .url()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, ''),
  };
}

/** The day's team image as a PNG file, or null where canvas drawing isn't available. */
export async function makeTeamImage(deps: ShareDeps, run: FinishedRun): Promise<File | null> {
  const blob = await renderShareImage(await imageInput(deps, run));
  return blob && shareImageFile(blob, deps.puzzle.number);
}
