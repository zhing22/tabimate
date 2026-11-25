import type { BadgeSection } from '../achievementsView';
import { unlockedCount } from '../achievementsView';
import { badgeId, badgeList } from '../components/badgeList';
import { card } from '../components/card';
import { pageTitle, type PageActions, type PageProps } from '../components/pageHeader';
import { settingsMenu } from '../components/settingsMenu';
import { focus, h } from '../dom';
import type { Screen } from '../host';
import { openPage } from '../layout/page';

export interface AchievementsProps extends PageProps {
  readonly sections: readonly BadgeSection[];
  /** Open at this achievement (a tapped toast): scrolled into view and focused. */
  readonly focusId?: string | undefined;
}

export type AchievementsActions = PageActions;

/** A section: its heading with how many of its own are unlocked, then its badges. */
function section({ id, name, icon, lines }: BadgeSection): HTMLElement {
  const unlocked = lines.filter((l) => l.unlockedKey !== null).length;
  const headingId = `achievements-${id}`;
  return h(
    'section',
    { class: 'achievements__section', 'aria-labelledby': headingId },
    h(
      'h2',
      { class: 'section-title achievements__heading', id: headingId },
      h('span', { 'aria-hidden': 'true' }, `${icon} `),
      name,
      h('span', { class: 'achievements__tally' }, ` · ${unlocked} of ${lines.length}`),
    ),
    badgeList(lines),
  );
}

/**
 * Achievements, on a page of their own: "N of M unlocked", then a section
 * per group (streaks, collection, scoring, exploration...), each a grid of
 * badges. Locked ones are dimmed and show what they ask and, when they count
 * something, a progress bar. Opened at one achievement, it scrolls to it.
 */
export const achievementsScreen: Screen<AchievementsProps, AchievementsActions> = (
  root,
  props,
  actions,
) => {
  const { unlocked, total } = unlockedCount(props.sections);
  const heading = pageTitle('achievements-title', 'Achievements');
  const settings = props.sound ? settingsMenu(props.sound) : null;
  const shown = card({
    className: 'card--journal achievements',
    title: heading,
    meta: `${unlocked} of ${total} unlocked`,
    back: () => actions.close(),
    close: actions.dismiss ?? (() => actions.close()),
    tools: [settings?.el],
    body: [h('div', { class: 'achievements__body' }, ...props.sections.map(section))],
  });
  root.append(shown.el);
  const closePage = openPage(shown.el, () => actions.close());
  const target = props.focusId
    ? root.querySelector<HTMLElement>(`#${badgeId(props.focusId)}`)
    : null;
  if (target) {
    target.classList.add('badge--focus');
    target.scrollIntoView?.({ block: 'center' });
    focus(target);
  } else focus(heading);
  return () => {
    closePage();
    settings?.destroy();
  };
};
