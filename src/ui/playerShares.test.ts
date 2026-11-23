// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { STATS } from '@/config/stats';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import type { DayStats } from '@/core/stats';
import type { RoundResult } from '@/core/types';
import { teamCard, type TeamRound } from './components/teamCard';
import { formatShare } from './format';
import { answerLines } from './resultsProps';

const tiger: RoundResult = {
  promptId: PROMPT.id,
  timeMs: 1,
  match: { level: 4, animalId: 'tiger', strategy: 'exact', input: 'tiger' },
};
const round: TeamRound = {
  prompt: PROMPT,
  result: tiger,
  animal: ANIMALS.get('tiger')!,
  answers: answerLines(PROMPT, ANIMALS, 'tiger'),
};
const stats = (players: number): DayStats => ({
  dateKey: '2026-11-23',
  prompts: { [PROMPT.id]: { players, answers: { tiger: Math.round(players * 0.03) } } },
});

function open(card: ReturnType<typeof teamCard>) {
  document.body.replaceChildren(card.el);
  const details = card.el.querySelector('details')!;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
}

describe('player shares on the results', () => {
  it('shows "x% picked this" and a share beside every answer once enough have played', () => {
    const card = teamCard([round]);
    open(card); // the list is built before the stats arrive...
    expect(card.el.querySelector('.answer__share')).toBeNull();
    card.showShares(stats(100)); // ...and fills in when they do
    expect(card.el.querySelector('.team-card__share')?.textContent).toBe('3% picked this');
    const shares = [...card.el.querySelectorAll('.answer__share')].map((s) => s.textContent);
    expect(shares).toHaveLength(round.answers.length);
    expect(shares).toContain(' · 0%');
  });

  it('shows no percentages while fewer than the minimum have played', () => {
    const card = teamCard([round]);
    card.showShares(stats(STATS.minPlayers - 1));
    open(card);
    expect(card.el.querySelector('.team-card__share')).toBeNull();
    expect(card.el.querySelector('.answer__share')).toBeNull();
  });

  it('rounds shares, with "<1%" for a sliver', () => {
    expect(formatShare(12.4)).toBe('12%');
    expect(formatShare(0.2)).toBe('<1%');
    expect(formatShare(0)).toBe('0%');
  });
});
