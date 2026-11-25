import type { ScreenHost } from './host';
import { mountRound, type RoundActions, type RoundProps, type RoundSetup } from './screens/round';

/**
 * The round screen mounts once and is then updated in place (see round.ts),
 * so this keeps hold of it between rounds.
 */
export function roundSlot(host: ScreenHost, setup: RoundSetup, actions: RoundActions) {
  let screen: ReturnType<typeof mountRound> | null = null;
  // The box can take focus (starting the timer) while the screen is still mounting.
  let startedDuringMount: number | null = null;
  return {
    show(props: RoundProps) {
      host.clearOverlay();
      if (screen) {
        screen.setRound(props);
        return;
      }
      host.showCustom((root) => {
        const mounted = mountRound(root, props, setup, actions);
        screen = mounted;
        if (startedDuringMount !== null) mounted.timerStarted(startedDuringMount);
        startedDuringMount = null;
        return () => {
          mounted.unmount();
          screen = null;
        };
      });
    },
    timerStarted(endsAt: number) {
      if (screen) screen.timerStarted(endsAt);
      else startedDuringMount = endsAt;
    },
    lock: () => screen?.lock(),
    reject: () => screen?.reject(),
    suggest: (name: string) => screen?.suggest(name),
    get mounted() {
      return screen !== null;
    },
  };
}
