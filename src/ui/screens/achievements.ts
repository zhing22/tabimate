import type { BadgeSection } from '../achievementsView';
import { unlockedCount } from '../achievementsView';
import { badgeId, badgeList } from '../components/badgeList';
import { COLLECTION_PAGE_CLASS, pageHeader } from '../components/pageHeader';
import { focus, h } from '../dom';
import type { Screen } from '../host';

export interface AchievementsProps {
  readonly sections: readonly BadgeSection[];
  /** Open at this achievement (a tapped toast): scrolled into view and focused. */
  readonly focusId?: string | undefined;
}

export interface AchievementsActions {
  /** Back to the screen the page was opened from. */
  close(): void;
}

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
  const head = pageHeader(
    'achievements-title',
    'Achievements',
    `${unlocked} of ${total} unlocked`,
    () => actions.close(),
  );
  root.append(
    h(
      'section',
      { class: 'card card--journal achievements', 'aria-labelledby': 'achievements-title' },
      head.el,
      h('div', { class: 'achievements__body' }, ...props.sections.map(section)),
    ),
  );
  document.documentElement.classList.add(COLLECTION_PAGE_CLASS);
  const target = props.focusId
    ? root.querySelector<HTMLElement>(`#${badgeId(props.focusId)}`)
    : null;
  if (target) {
    target.classList.add('badge--focus');
    target.scrollIntoView?.({ block: 'center' });
    focus(target);
  } else focus(head.heading);
  return () => document.documentElement.classList.remove(COLLECTION_PAGE_CLASS);
};
