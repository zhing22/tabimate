import { ROUND_TIME_MS } from '@/config/game';
import { themeFor } from '@/config/themes';
import type { RoundResult } from '@/core/types';
import type { App, AppDeps } from './appTypes';
import { createCollectionUi } from './collectionUi';
import type { AnimalOf } from './resultsProps';
import { createResultsFlow } from './resultsFlow';
import { createScreenLoader } from './screenLoader';
import { showRevealCard } from './revealFlow';
import { roundSlot } from './roundSlot';
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
  // One loader for the screens that load on first use: the last asked for shows.
  const openScreen = createScreenLoader();
  const collection = createCollectionUi({
    ...deps,
    openScreen,
    portraits: deps.journalPortraits ?? deps.portraits,
    delay: deps.delay,
  });
  const results = createResultsFlow({ app: deps, collection, animalOf, openScreen });
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
    {
      submit: (text) => controller.submit(text),
      next,
      draft: (text) => controller.setDraft(text),
      begin: () => controller.beginRound(),
    },
  );
  const revealDeps = {
    host,
    puzzle,
    animals,
    animalOf,
    timing: deps.revealTiming,
    // The scene has already recoloured today's animals; reuse them.
    portraits: deps.portraits ?? deps.journalPortraits,
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
        sound: deps.sound,
      },
      { play: () => controller.start(), ...collection.links(showStart) },
    );
  }

  const stopBonus = startBonusFlow({ host, bus, controller, now, frames: deps.frames });
  const stops = [
    bus.on('roundStarted', ({ index, prompt, endsAt }) =>
      round.show({ index, total: puzzle.prompts.length, prompt, endsAt }),
    ),
    bus.on('roundTimerStarted', ({ endsAt }) => round.timerStarted(endsAt)),
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
      results.show(run);
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
