import type { InstallOffer } from '@/core/install';
import { card } from '../components/card';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { howToPlay } from '../components/howToPlay';
import { installHint } from '../components/installHint';
import { settingsMenu, type SoundSetting } from '../components/settingsMenu';
import { themeChip } from '../components/themeChip';
import { wordmark } from '../components/wordmark';
import { h, focus } from '../dom';
import type { Screen } from '../host';
import { placeOnStage } from '../layout/stage';

export interface StartProps {
  readonly puzzleNumber: number;
  readonly promptCount: number;
  /** Current streak; 0 hides the line. */
  readonly streak: number;
  /** A day was missed and a streak freeze is keeping the streak. */
  readonly savedByFreeze: boolean;
  /** A freeze is held, ready for a missed day. */
  readonly freezeReady: boolean;
  readonly install?: InstallOffer | undefined;
  /** The day's theme (config/themes.ts), or null on a plain day. */
  readonly theme: { readonly name: string; readonly tagline: string } | null;
  /** The sound setting, for the settings menu (none without sound). */
  readonly sound?: SoundSetting | undefined;
}

export interface StartActions extends CollectionLinks {
  play(): void;
}

/** One line under the chip: the theme's tagline, or what the game is. */
const TAGLINE = 'A daily journey with animal friends';

/** "🔥 5-day streak", with the freeze that saved it or the one held ready. */
function streakLine(props: StartProps): HTMLElement | null {
  if (props.streak <= 0) return null;
  const freeze = props.savedByFreeze
    ? h('span', { class: 'streak__freeze' }, '❄ Streak saved by a freeze')
    : props.freezeReady
      ? h('span', { class: 'streak__freeze' }, '❄ Freeze ready')
      : null;
  return h('p', { class: 'meta streak' }, `🔥 ${props.streak}-day streak`, freeze);
}

/**
 * The start: the wordmark and settings; in the middle of the free space, the
 * day's chip, a tagline and Play right under it (then the streak); at the
 * bottom the collection tiles and "How to play". On the stage the traveller
 * waits with a "Ready?" bubble.
 */
export const startScreen: Screen<StartProps, StartActions> = (root, props, actions) => {
  const play = h('button', { class: 'button button--primary start__play', type: 'button' }, 'Play');
  play.addEventListener('click', () => actions.play());
  const settings = props.sound ? settingsMenu(props.sound) : null;
  const help = howToPlay();
  const shown = card({
    className: 'card--journal start',
    title: h('h1', { id: 'start-title', class: 'start__title' }, wordmark('lg')),
    tools: [settings?.el],
    body: [
      h(
        'div',
        { class: 'start__hero' },
        themeChip(props.puzzleNumber, props.theme?.name ?? null),
        h('p', { class: 'subtitle' }, props.theme?.tagline ?? TAGLINE),
        play,
        streakLine(props),
      ),
      installHint(props.install),
      help.rules,
    ],
    footer: [collectionLinks(actions), help.toggle],
  });
  root.append(shown.el);
  const bubble = h('p', { class: 'stage-bubble' }, 'Ready?');
  const unplace = placeOnStage(bubble, h('div', { hidden: true }));
  focus(play);
  return () => {
    unplace();
    settings?.destroy();
  };
};
