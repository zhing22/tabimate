// Sharing a finished day: the text (services/shareText.ts) and the team image
// (services/shareImage.ts), made from the scene's sprites and backdrop when
// there is a scene, emoji and plain colours when not.
import { themeFor } from '@/config/themes';
import { isShiny, LEVELS } from '@/config/levels';
import { biomeFor } from '@/core/journey';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { APP_COLOURS } from '@/config/ui';
import {
  downloadImage,
  renderShareImage,
  shareImageFile,
  type ShareImageInput,
} from '@/services/shareImage';
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
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || APP_COLOURS.ink;

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
  // One finished run per page: its image is made once, as the results open.
  // `ready` holds it once made, so a tap on Share never waits for drawing
  // (browsers only allow a share right after the tap); until then the text
  // goes alone.
  let ready: File | null = null;
  let making: Promise<File | null> | null = null;
  const teamImage = (run: FinishedRun) =>
    (making ??= imageInput(deps, run)
      .then(renderShareImage)
      .then((blob) => (ready = blob && shareImageFile(blob, deps.puzzle.number)))
      .catch((error: unknown) => {
        console.error('Share image failed', error);
        return null;
      }));
  return {
    /** Starts making the image (call when the results show). */
    prepare: (run: FinishedRun) => void teamImage(run),
    share: (run: FinishedRun) => {
      void teamImage(run); // in case it was never started
      return share(
        buildShareText(
          { results: run.results, animals: deps.animals },
          deps.puzzle.number,
          biomeFor(run.score),
          deps.url(),
          themeFor(deps.puzzle.date)?.name ?? null,
        ),
        browserEnvironment(),
        () => ready,
      );
    },
    saveImage: (run: FinishedRun) =>
      void teamImage(run).then((file) => {
        if (file) downloadImage(file);
      }),
  };
}
