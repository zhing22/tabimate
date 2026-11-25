import { ANSWER_LEVELS, LEVELS, TOP_LEVEL } from '@/config/levels';
import { h } from '../dom';

/** "Rarer answers score more, from LC (10) up to CR (100).", read from LEVELS. */
function scoringLine(): string {
  const low = LEVELS[ANSWER_LEVELS[0] ?? TOP_LEVEL];
  const high = LEVELS[TOP_LEVEL];
  return `Rarer answers score more, from ${low.shortName} (${low.points}) up to ${high.shortName} (${high.points}).`;
}

/**
 * "How to play": a link-style button (last in the start card's footer, in
 * regular weight) and
 * the rules it shows and hides (at the end of the card's body, scrolled to).
 */
export function howToPlay(): { readonly toggle: HTMLButtonElement; readonly rules: HTMLElement } {
  const rules = h(
    'section',
    { class: 'how-to', id: 'how-to', hidden: true, 'aria-label': 'How to play' },
    h(
      'ul',
      {},
      h('li', {}, 'Each prompt asks for an animal. Type one before the ring runs out.'),
      h('li', {}, scoringLine()),
      h('li', {}, 'Close enough? We fix typos and short names for you: press Go again to answer.'),
      h('li', {}, 'Every animal you find joins your trail. One journey a day.'),
      // Privacy: what player stats send, in plain words (v2 Step 13).
      h(
        'li',
        { class: 'how-to__privacy' },
        'No sign-up, no personal data. When you finish, your answers are sent with a random id kept on this device, so we can show how many players picked each one.',
      ),
    ),
  );
  const toggle = h(
    'button',
    { class: 'link-button', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'how-to' },
    'How to play',
  );
  toggle.addEventListener('click', () => {
    rules.hidden = !rules.hidden;
    toggle.setAttribute('aria-expanded', String(!rules.hidden));
    if (!rules.hidden) rules.scrollIntoView?.({ block: 'nearest' });
  });
  return { toggle, rules };
}
