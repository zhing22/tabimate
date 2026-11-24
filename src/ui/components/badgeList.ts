import type { BadgeLine } from '../achievementsView';
import { h } from '../dom';
import { formatDateKey } from '../format';

/** The element id of an achievement's badge, so a toast can open the page at it. */
export const badgeId = (achievementId: string) => `achievement-${achievementId}`;

/** "4 of 7", with a bar: how far along a locked, count-based achievement is. */
function progressBar(name: string, { current, target }: { current: number; target: number }) {
  const text = `${current} of ${target}`;
  return h(
    'span',
    { class: 'badge__progress' },
    h('progress', {
      class: 'badge__bar',
      max: target,
      value: current,
      'aria-label': `${name}: ${text}`,
    }),
    h('span', { class: 'badge__count', 'aria-hidden': 'true' }, text),
  );
}

/**
 * When it was unlocked; or, locked, whether it's waiting: achievements are
 * checked as a day is finished, so a goal reached since unlocks with the next.
 */
function whenText(unlockedKey: string | null, progress: BadgeLine['progress']): string {
  if (unlockedKey) return `Unlocked ${formatDateKey(unlockedKey)}`;
  if (progress && progress.current >= progress.target)
    return 'Done! Unlocks with your next journey';
  return 'Locked';
}

/**
 * One achievement: its art and name, what it asks, and either the day it was
 * unlocked or (dimmed, while locked) a progress bar when it counts something.
 * Focusable from script only, so a toast can bring it into view.
 */
export function badge({ achievement, unlockedKey, progress }: BadgeLine): HTMLElement {
  return h(
    'li',
    {
      class: unlockedKey ? 'badge' : 'badge badge--locked',
      id: badgeId(achievement.id),
      tabindex: -1,
    },
    h('span', { class: 'badge__icon', 'aria-hidden': 'true' }, achievement.icon),
    h(
      'span',
      { class: 'badge__body' },
      h('strong', { class: 'badge__name' }, achievement.name),
      h('span', { class: 'badge__text' }, achievement.description),
      h('span', { class: 'badge__when' }, whenText(unlockedKey, progress)),
      progress ? progressBar(achievement.name, progress) : null,
    ),
  );
}

/** A section's badges, in a grid. */
export function badgeList(lines: readonly BadgeLine[]): HTMLElement {
  return h('ul', { class: 'badge-list' }, ...lines.map(badge));
}
