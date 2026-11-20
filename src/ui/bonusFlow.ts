// The bonus quiz's part of the UI: shows each step as the game announces it,
// and sends the player's answers back to the controller.
import type { GameBus } from '@/core/events';
import type { GameController } from '@/core/gameController';
import type { FrameLoop } from './frames';
import type { ScreenHost } from './host';
import { bonusScreen, verdict, type BonusView } from './screens/bonus';

export interface BonusFlowDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly controller: Pick<GameController, 'answerBonus' | 'next'>;
  readonly now: () => number;
  readonly frames?: FrameLoop | undefined;
}

/** Subscribes to the quiz events; returns how to stop. */
export function startBonusFlow(deps: BonusFlowDeps): () => void {
  const { host, bus, controller } = deps;
  const show = (view: BonusView) =>
    host.show(
      bonusScreen,
      { view, now: deps.now, frames: deps.frames },
      { answer: (value) => controller.answerBonus(value), next: () => controller.next() },
    );
  const stops = [
    bus.on('bonusIntro', ({ total }) => {
      show({ kind: 'intro', total });
      host.announce(`Bonus quiz: ${total} true-or-false questions.`);
    }),
    bus.on('bonusQuestionStarted', (q) => {
      show({ kind: 'question', ...q });
      host.announce(q.item.statement);
    }),
    bus.on('bonusAnswered', (a) => {
      show({ kind: 'answered', ...a });
      host.announce(`${verdict(a.result, a.item)} ${a.item.explanation}`);
    }),
  ];
  return () => {
    for (const stop of stops) stop();
  };
}
