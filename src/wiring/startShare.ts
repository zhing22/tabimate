// Sharing a finished day: the text (services/shareText.ts) and the team image
// (services/shareImage.ts), made from the scene's sprites and backdrop when
// there is a scene, emoji and plain colours when not.
import { themeFor } from '@/config/themes';
import { isShiny, LEVELS } from '@/config/levels';
import { biomeFor } from '@/core/journey';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { downloadImage, renderShareImage, type ShareImageInput } from '@/services/shareImage';
import { browserEnvironment, buildShareText, MISS_EMOJI, share } from '@/services/share';
import type { FinishedRun } from '@/ui/app';
import { formatDateKey } from '@/ui/format';

export interface ShareDeps {
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly portraits?: Portraits | undefined;
  readonly backdrops?: Backdrops | undefined;
  /** The site's link, at the end of the text and the foot of the image. */
  readonly url: () => string;
}

const cssColour = (token: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#2b2134';

async function imageInput(deps: ShareDeps, run: FinishedRun): Promise<ShareImageInput> {
  const { puzzle, animals } = deps;
  const theme = themeFor(puzzle.date)?.name ?? null;
  const biome = biomeFor(run.score);
  const members = await Promise.all(
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
    backdrop: (await deps.backdrops?.(run.score)) ?? null,
    members,
    footer: deps
      .url()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, ''),
  };
}

export function startShare(deps: ShareDeps) {
  // One finished run per page: its image is made once, as the results open,
  // so a tap on Share can hand it to the share sheet straight away.
  let image: Promise<Blob | null> | null = null;
  const teamImage = (run: FinishedRun) =>
    (image ??= imageInput(deps, run).then(renderShareImage, (error: unknown) => {
      console.error('Share image failed', error);
      return null;
    }));
  return {
    /** Starts making the image (call when the results show). */
    prepare: (run: FinishedRun) => void teamImage(run),
    share: (run: FinishedRun) =>
      share(
        buildShareText(
          { results: run.results, animals: deps.animals },
          deps.puzzle.number,
          biomeFor(run.score),
          deps.url(),
          themeFor(deps.puzzle.date)?.name ?? null,
        ),
        browserEnvironment(),
        () => teamImage(run),
      ),
    saveImage: (run: FinishedRun) =>
      void teamImage(run).then((blob) => {
        if (blob) downloadImage(blob, `tabimate-${deps.puzzle.number}.png`);
      }),
  };
}
