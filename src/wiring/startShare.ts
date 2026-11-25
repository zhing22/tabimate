// Sharing a finished day: the text (services/shareText.ts) and the team image
// (services/shareImage.ts, through wiring/shareTeamImage.ts, loaded on first
// use), made from the scene's sprites and backdrop when there is a scene,
// emoji and plain colours when not.
import { themeFor } from '@/config/themes';
import { biomeFor } from '@/core/journey';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { browserEnvironment, buildShareText, share } from '@/services/share';
import type { FinishedRun } from '@/ui/app';

export interface ShareDeps {
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly portraits?: Portraits | undefined;
  readonly backdrops?: Backdrops | undefined;
  /** The site's link, at the end of the text and the foot of the image. */
  readonly url: () => string;
}

export function startShare(deps: ShareDeps) {
  // One finished run per page: its image is made once, as the results open.
  // `ready` holds it once made, so a tap on Share never waits for drawing
  // (browsers only allow a share right after the tap); until then the text
  // goes alone.
  let ready: File | null = null;
  let making: Promise<File | null> | null = null;
  const teamImage = (run: FinishedRun) =>
    (making ??= import('./shareTeamImage')
      .then(({ makeTeamImage }) => makeTeamImage(deps, run))
      .then((file) => (ready = file))
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
          { results: run.results, animals: deps.animals, bonusResults: run.bonusResults },
          deps.puzzle.number,
          biomeFor(run.base),
          deps.url(),
          themeFor(deps.puzzle.date)?.name ?? null,
        ),
        browserEnvironment(),
        () => ready,
      );
    },
    saveImage: (run: FinishedRun) =>
      void teamImage(run).then(async (file) => {
        if (file) (await import('./shareTeamImage')).downloadImage(file);
      }),
  };
}
