import { ROUND_TIME_MS } from '@/config/game';
import { themeFor } from '@/config/themes';
import { msUntilNextReset } from '@/core/date';
import type { RoundResult } from '@/core/types';
import type { App, AppDeps } from './appTypes';
import { createCollectionUi } from './collectionUi';
import { resultsProps, type AnimalOf, type FinishedRun } from './resultsProps';
import { showRevealCard } from './revealFlow';
import { roundSlot } from './roundSlot';
import { resultsScreen } from './screens/results';
import { DID_YOU_MEAN, NOT_FOUND } from './screens/roundView';
import { startScreen } from './screens/start';
import { startBonusFlow } from './bonusFlow';

export type { FinishedRun } from './resultsProps';
export type { App, AppDeps } from './appTypes';

/**
 * The UI router: turns game events into screens and player actions into
 * controller calls. It never changes game state itself.
 */
export function createApp(deps: AppDeps): App {
  const { host, bus, controller, puzzle, animals, clock } = deps;
  const now = () => clock.now().getTime();
  const animalOf: AnimalOf = (result) =>
    result.match.animalId === null ? null : (animals.get(result.match.animalId) ?? null);
  const collection = createCollectionUi({
    ...deps,
    portraits: deps.journalPortraits ?? deps.portraits,
    delay: deps.delay,
  });
  // Moving on only counts once the result is visible, so an Enter pressed twice
  // in a hurry can't skip past a reveal during its drum-roll.
  let resultShown = false;
  const next = () => {
    if (!resultShown) return;
    resultShown = false;
    controller.next();
  };
  const round = roundSlot(
    host,
    { totalMs: ROUND_TIME_MS, now, ...(deps.frames ? { frames: deps.frames } : {}) },
    { submit: (text) => controller.submit(text), next, draft: (text) => controller.setDraft(text) },
  );
  const revealDeps = {
    host,
    puzzle,
    animals,
    animalOf,
    timing: deps.revealTiming,
    portraits: deps.journalPortraits ?? deps.portraits,
    isNew: (result: RoundResult, index: number) =>
      result.match.animalId !== null &&
      collection.isNewToJournal(
        result.match.animalId,
        controller.getState().results.slice(0, index),
      ),
  };

  function showReveal(index: number, result: RoundResult) {
    resultShown = false;
    round.lock();
    showRevealCard(revealDeps, index, result, {
      focusNext: !round.mounted,
      revealed: (summary) => {
        resultShown = true;
        host.announce(summary);
      },
      next,
    });
  }

  function renderResults(run: FinishedRun) {
    // Fixed when the screen opens: asking "time to the next reset" every second
    // would jump back to 24 h at noon and never reach zero.
    const nextPuzzleAt = now() + msUntilNextReset(clock.now());
    const props = resultsProps(puzzle, animalOf, animals, run, () => nextPuzzleAt - now());
    host.show(
      resultsScreen,
      {
        ...props,
        ...(deps.delay ? { delay: deps.delay } : {}),
        ...(deps.portraits ? { portraits: deps.portraits } : {}),
        ...(deps.backdrops ? { backdrops: deps.backdrops } : {}),
        install: deps.install,
      },
      {
        next: deps.reload,
        share: () => deps.share(run),
        saveImage: deps.saveImage && (() => deps.saveImage?.(run)),
        ...collection.links(() => renderResults(run)),
      },
    );
  }

  function showStart() {
    const status = deps.getStreakStatus();
    host.show(
      startScreen,
      {
        puzzleNumber: puzzle.number,
        promptCount: puzzle.prompts.length,
        streak: status.streak,
        savedByFreeze: status.savedByFreeze,
        freezeReady: deps.getStats().freezes > 0,
        theme: themeFor(puzzle.date),
        install: deps.install,
      },
      { play: () => controller.start(), ...collection.links(showStart) },
    );
  }

  const stopBonus = startBonusFlow({ host, bus, controller, now, frames: deps.frames });
  const stops = [
    bus.on('roundStarted', ({ index, prompt, endsAt }) =>
      round.show({ index, total: puzzle.prompts.length, prompt, endsAt }),
    ),
    // Spoken through the host's live region, which re-reads a repeated message.
    bus.on('answerRejected', () => {
      round.reject();
      host.announce(NOT_FOUND);
    }),
    bus.on('answerSuggested', ({ suggestion }) => {
      round.suggest(suggestion);
      host.announce(`${suggestion}. ${DID_YOU_MEAN}`);
    }),
    bus.on('answerMatched', ({ round: index, result }) => showReveal(index, result)),
    bus.on('runRestored', ({ state }) => {
      const index = state.results.length - 1;
      const last = state.results[index];
      if (state.status === 'revealing' && last) showReveal(index, last);
    }),
    bus.on('biomeEntered', ({ biome }) => host.announce(`You entered the ${biome.name}.`)),
  ];

  return {
    showStart,
    showResults(run) {
      renderResults(run);
      host.announce(`Journey complete: ${run.score} points.`);
    },
    destroy() {
      for (const stop of stops) stop();
      stopBonus();
      collection.destroy();
      host.destroy();
    },
  };
}
