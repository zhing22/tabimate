// The bonus quiz's part of the UI: shows each step as the game announces it,
// and sends the player's answers back to the controller. The quiz screen
// loads on first use (screenLoader.ts): only Sunday's journeys have one.
import type { GameBus } from '@/core/events';
import type { GameController } from '@/core/gameController';
import type { FrameLoop } from './frames';
import type { ScreenHost } from './host';
import { createScreenLoader, type OpenScreen } from './screenLoader';
import type { BonusView } from './screens/bonus';

const loadBonus = () => import('./screens/bonus');
type BonusModule = Awaited<ReturnType<typeof loadBonus>>;

export interface BonusFlowDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly controller: Pick<GameController, 'answerBonus' | 'next'>;
  readonly now: () => number;
  readonly frames?: FrameLoop | undefined;
  /** Shared with the other screens that load on first use. */
  readonly openScreen?: OpenScreen | undefined;
}

/** Subscribes to the quiz events; returns how to stop. */
export function startBonusFlow(deps: BonusFlowDeps): () => void {
  const { host, bus, controller } = deps;
  const open = deps.openScreen ?? createScreenLoader();
  /** Shows a step once the screen is loaded, then says `said` for screen readers. */
  const show = (view: BonusView, said: (m: BonusModule) => string) =>
    open(loadBonus, (m) => {
      host.show(
        m.bonusScreen,
        { view, now: deps.now, frames: deps.frames },
        { answer: (value) => controller.answerBonus(value), next: () => controller.next() },
      );
      host.announce(said(m));
    });
  const stops = [
    bus.on('bonusIntro', ({ total }) =>
      show({ kind: 'intro', total }, () => `Bonus quiz: ${total} true-or-false questions.`),
    ),
    bus.on('bonusQuestionStarted', (q) => show({ kind: 'question', ...q }, () => q.item.statement)),
    bus.on('bonusAnswered', (a) =>
      show(
        { kind: 'answered', ...a },
        (m) => `${m.verdict(a.result, a.item)} ${a.item.explanation}`,
      ),
    ),
  ];
  return () => {
    for (const stop of stops) stop();
  };
}
