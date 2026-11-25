import { ANSWER_LEVELS, LEVELS, TOP_LEVEL } from '@/config/levels';
import type { InstallOffer } from '@/core/install';
import { card } from '../components/card';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { installHint } from '../components/installHint';
import { settingsMenu, type SoundSetting } from '../components/settingsMenu';
import { h, focus } from '../dom';
import type { Screen } from '../host';

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

/** "Rarer answers score more, from LC (10) up to CR (100).", read from LEVELS. */
function scoringLine(): string {
  const low = LEVELS[ANSWER_LEVELS[0] ?? TOP_LEVEL];
  const high = LEVELS[TOP_LEVEL];
  return `Rarer answers score more, from ${low.shortName} (${low.points}) up to ${high.shortName} (${high.points}).`;
}

export interface StartActions extends CollectionLinks {
  play(): void;
}

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

export const startScreen: Screen<StartProps, StartActions> = (root, props, actions) => {
  const play = h('button', { class: 'button button--primary', type: 'button' }, 'Play');
  play.addEventListener('click', () => actions.play());

  const settings = props.sound ? settingsMenu(props.sound) : null;
  const shown = card({
    className: 'card--journal start',
    title: h('h1', { id: 'start-title', class: 'title' }, 'Tabimate'),
    tools: [settings?.el],
    footer: [play],
    body: [
      h('p', { class: 'subtitle' }, 'A daily journey with animal friends'),
      h('p', { class: 'meta' }, `Puzzle #${props.puzzleNumber} · ${props.promptCount} prompts`),
      props.theme
        ? h(
            'p',
            { class: 'theme' },
            h('strong', { class: 'theme__name' }, props.theme.name),
            h('span', { class: 'theme__tagline' }, props.theme.tagline),
          )
        : null,
      streakLine(props),
      collectionLinks(actions),
      installHint(props.install),
      h(
        'details',
        { class: 'how-to' },
        h('summary', {}, 'How to play'),
        h(
          'ul',
          {},
          h('li', {}, 'Each prompt asks for an animal. Type one before the ring runs out.'),
          h('li', {}, scoringLine()),
          h(
            'li',
            {},
            'Close enough? We fix typos and short names for you: press Go again to answer.',
          ),
          h('li', {}, 'Every animal you find joins your trail. One journey a day.'),
          // Privacy: what player stats send, in plain words (v2 Step 13).
          h(
            'li',
            { class: 'how-to__privacy' },
            'No sign-up, no personal data. When you finish, your answers are sent with a random id kept on this device, so we can show how many players picked each one.',
          ),
        ),
      ),
    ],
  });
  root.append(shown.el);
  focus(play);
  return () => settings?.destroy();
};
